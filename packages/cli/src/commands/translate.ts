/**
 * ats translate — LLM batch translation via Ollama
 *
 * Finds missing keys in target language files compared to the default language,
 * then uses a local Ollama model to translate them.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { collectFlatKeys, writeJsonFile, getNestedValue, setNestedValue } from './utils';
import { resolveDefaultLang } from './resolve-default-lang';

interface TranslateOptions {
    input?: string;
    locale: string;
    namespace?: string;
    model: string;
    host: string;
    autoAccept?: boolean;
    defaultLang?: string;
}

interface OllamaResponse {
    response: string;
    done: boolean;
}

/** Maximum entries per LLM batch to avoid context overflow */
const BATCH_SIZE = 35;

export async function translateKeys(options: TranslateOptions): Promise<void> {
    const i18nDir = resolve(options.input ?? 'src/i18n');

    if (!existsSync(i18nDir)) {
        console.error(`❌ i18n directory not found: ${i18nDir}`);
        console.error('   Pass -i <dir> or run from your project root with src/i18n present.');
        process.exit(1);
    }

    // Discover language directories
    const langDirs = readdirSync(i18nDir).filter((entry) => {
        const fullPath = join(i18nDir, entry);
        try {
            return existsSync(fullPath) && readdirSync(fullPath).some((f) => f.endsWith('.json'));
        } catch {
            return false;
        }
    }).sort();

    if (langDirs.length === 0) {
        console.error('❌ No language directories found.');
        process.exit(1);
    }

    const defaultLang = resolveDefaultLang(langDirs, options.defaultLang);
    const targetLang = options.locale;
    const defaultDir = join(i18nDir, defaultLang);
    const targetDir = join(i18nDir, targetLang);

    if (!existsSync(targetDir)) {
        console.error(`❌ Target language directory not found: ${targetDir}`);
        process.exit(1);
    }

    console.log('🌍 LLM Translation');
    console.log(`   Source:  ${defaultLang}`);
    console.log(`   Target:  ${targetLang}`);
    console.log(`   Model:   ${options.model}`);
    console.log(`   Host:    ${options.host}`);
    console.log(`   Mode:    ${options.autoAccept ? 'auto-accept' : 'interactive'}`);
    console.log('');

    // Find all namespaces in default language
    const defaultFiles = readdirSync(defaultDir).filter((f) => f.endsWith('.json'));
    let totalTranslated = 0;

    for (const file of defaultFiles) {
        const ns = file.replace('.json', '');
        if (options.namespace && ns !== options.namespace) continue;

        const defaultData = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8')) as Record<string, unknown>;
        const targetFile = join(targetDir, file);
        const targetData = existsSync(targetFile)
            ? (JSON.parse(readFileSync(targetFile, 'utf-8')) as Record<string, unknown>)
            : {};

        const defaultKeys = collectFlatKeys(defaultData);
        const targetKeys = new Set(collectFlatKeys(targetData));

        // Find missing keys
        const missingKeys = defaultKeys.filter((key) => !targetKeys.has(key));

        if (missingKeys.length === 0) {
            console.log(`📦 ${ns}.json — ✅ all keys translated`);
            continue;
        }

        console.log(`📦 ${ns}.json — ${missingKeys.length} missing key(s)`);

        // Build entries for translation
        const entries: Array<{ key: string; value: string }> = [];
        for (const key of missingKeys) {
            const value = getNestedValue(defaultData, key);
            if (typeof value === 'string') {
                entries.push({ key, value });
            }
        }

        // Batch translate
        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const batch = entries.slice(i, i + BATCH_SIZE);
            console.log(`   Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)} (${batch.length} keys)...`);

            try {
                const translations = await callOllama(
                    batch,
                    defaultLang,
                    targetLang,
                    options.model,
                    options.host,
                );

                // Apply translations
                for (const [key, translated] of Object.entries(translations)) {
                    if (typeof translated === 'string' && translated.trim()) {
                        if (!options.autoAccept) {
                            const original = batch.find((e) => e.key === key)?.value ?? '';
                            console.log(`   ${key}`);
                            console.log(`     ${defaultLang}: ${original}`);
                            console.log(`     ${targetLang}: ${translated}`);
                        }
                        setNestedValue(targetData, key, translated);
                        totalTranslated++;
                    }
                }
            } catch (err) {
                console.error(`   ❌ Batch failed: ${(err as Error).message}`);
                console.error('   Falling back to per-key translation...');

                // Per-key fallback
                for (const entry of batch) {
                    try {
                        const result = await callOllama(
                            [entry],
                            defaultLang,
                            targetLang,
                            options.model,
                            options.host,
                        );

                        const translated = result[entry.key];
                        if (typeof translated === 'string' && translated.trim()) {
                            setNestedValue(targetData, entry.key, translated);
                            totalTranslated++;
                            console.log(`   ✅ ${entry.key}: ${translated}`);
                        }
                    } catch {
                        console.error(`   ❌ ${entry.key}: failed`);
                    }
                }
            }
        }

        // Write updated target file
        writeJsonFile(targetFile, targetData);
        console.log(`   ✅ Written ${targetFile}`);
        console.log('');
    }

    console.log(`\n✅ Translated ${totalTranslated} key(s) to ${targetLang}.`);
}

/**
 * Calls Ollama /api/generate to translate a batch of entries.
 */
async function callOllama(
    entries: Array<{ key: string; value: string }>,
    sourceLang: string,
    targetLang: string,
    model: string,
    host: string,
): Promise<Record<string, string>> {
    const entriesJson = JSON.stringify(
        Object.fromEntries(entries.map((e) => [e.key, e.value])),
        null,
        2,
    );

    const prompt = `Translate the following JSON values from "${sourceLang}" to "${targetLang}".
Keep the keys exactly as they are. Only translate the values.
If a value contains interpolation placeholders like {{name}} or {count}, keep them unchanged.

Input:
\`\`\`json
${entriesJson}
\`\`\`

Reply with ONLY the translated JSON (no explanation, no markdown):`;

    const response = await fetch(`http://${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
                temperature: 0.2,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return parseJsonResponse(data.response);
}

/**
 * Extracts JSON from an LLM response, handling code fences and extra text.
 */
function parseJsonResponse(text: string): Record<string, string> {
    // Try direct parse first
    try {
        return JSON.parse(text);
    } catch { /* fall through */ }

    // Extract from code fence
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch { /* fall through */ }
    }

    // Try to find JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch { /* fall through */ }
    }

    throw new Error('Could not parse JSON from LLM response');
}
