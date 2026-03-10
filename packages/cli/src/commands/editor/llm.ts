// ─── LLM Translation — Multi-Provider ───────────────────────

export type LLMProvider = 'ollama' | 'openai' | 'gemini';

export interface TranslateRequest {
    entries: Array<{ key: string; value: string }>;
    sourceLang: string;
    targetLang: string;
    provider: LLMProvider;
    model: string;
    config: {
        host?: string;     // Ollama: 'localhost:11434'
        baseUrl?: string;  // OpenAI-compat: 'https://api.openai.com'
        apiKey?: string;   // OpenAI / Gemini
    };
}

export interface ProviderStatusRequest {
    provider: LLMProvider;
    config: {
        host?: string;
        baseUrl?: string;
        apiKey?: string;
    };
}

// ─── Dispatcher ─────────────────────────────────────────────

export async function callLLM(req: TranslateRequest): Promise<Record<string, string>> {
    switch (req.provider) {
        case 'ollama':
            return callOllama(req);
        case 'openai':
            return callOpenAI(req);
        case 'gemini':
            return callGemini(req);
        default:
            throw new Error(`Unsupported LLM provider: ${req.provider}`);
    }
}

export async function checkProviderStatus(
    req: ProviderStatusRequest,
): Promise<{ online: boolean; models: string[] }> {
    try {
        switch (req.provider) {
            case 'ollama':
                return await checkOllamaStatus(req.config.host || 'localhost:11434');
            case 'openai':
                return await checkOpenAIStatus(req.config.baseUrl || 'https://api.openai.com', req.config.apiKey || '');
            case 'gemini':
                return await checkGeminiStatus(req.config.apiKey || '');
            default:
                return { online: false, models: [] };
        }
    } catch {
        return { online: false, models: [] };
    }
}

// ─── Shared Prompt Builder ──────────────────────────────────

function buildTranslationPrompt(
    entries: Array<{ key: string; value: string }>,
    sourceLang: string,
    targetLang: string,
): string {
    const entriesJson = JSON.stringify(
        Object.fromEntries(entries.map((e) => [e.key, e.value])),
        null,
        2,
    );

    return `Translate the following JSON values from "${sourceLang}" to "${targetLang}".
Keep the keys exactly as they are. Only translate the values.
If a value contains interpolation placeholders like {{name}} or {count}, keep them unchanged.

Input:
\`\`\`json
${entriesJson}
\`\`\`

Reply with ONLY the translated JSON (no explanation, no markdown):`;
}

// ─── Ollama Provider ────────────────────────────────────────

interface OllamaResponse {
    response: string;
    done: boolean;
}

async function callOllama(req: TranslateRequest): Promise<Record<string, string>> {
    const host = req.config.host || 'localhost:11434';
    const prompt = buildTranslationPrompt(req.entries, req.sourceLang, req.targetLang);

    const response = await fetch(`http://${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: req.model,
            prompt,
            stream: false,
            options: { temperature: 0.2 },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return parseJsonResponse(data.response);
}

async function checkOllamaStatus(host: string): Promise<{ online: boolean; models: string[] }> {
    const res = await fetch(`http://${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json() as { models?: Array<{ name: string }> };
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return { online: true, models };
}

// ─── OpenAI-Compatible Provider ─────────────────────────────

interface OpenAIChatResponse {
    choices: Array<{ message: { content: string } }>;
}

async function callOpenAI(req: TranslateRequest): Promise<Record<string, string>> {
    const baseUrl = (req.config.baseUrl || 'https://api.openai.com').replace(/\/$/, '');
    const apiKey = req.config.apiKey || '';
    const prompt = buildTranslationPrompt(req.entries, req.sourceLang, req.targetLang);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: req.model,
            messages: [
                { role: 'system', content: 'You are a professional translator. Reply ONLY with valid JSON, no explanation.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}${text ? ' — ' + text.slice(0, 200) : ''}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content || '';
    return parseJsonResponse(content);
}

async function checkOpenAIStatus(baseUrl: string, apiKey: string): Promise<{ online: boolean; models: string[] }> {
    const url = `${baseUrl.replace(/\/$/, '')}/v1/models`;
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json() as { data?: Array<{ id: string }> };
    const models = (data.data || []).map((m: { id: string }) => m.id).sort();
    return { online: true, models };
}

// ─── Google Gemini Provider ─────────────────────────────────

interface GeminiResponse {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

async function callGemini(req: TranslateRequest): Promise<Record<string, string>> {
    const apiKey = req.config.apiKey || '';
    if (!apiKey) throw new Error('Gemini API key is required');

    const prompt = buildTranslationPrompt(req.entries, req.sourceLang, req.targetLang);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
            }),
        },
    );

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}${text ? ' — ' + text.slice(0, 200) : ''}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseJsonResponse(content);
}

async function checkGeminiStatus(apiKey: string): Promise<{ online: boolean; models: string[] }> {
    if (!apiKey) return { online: false, models: [] };

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error('not ok');
    const data = await res.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const models = (data.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''));
    return { online: true, models };
}

// ─── Shared JSON Parser ─────────────────────────────────────

export function parseJsonResponse(text: string): Record<string, string> {
    try {
        return JSON.parse(text);
    } catch { /* fall through */ }

    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch { /* fall through */ }
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch { /* fall through */ }
    }

    throw new Error('Could not parse JSON from LLM response');
}
