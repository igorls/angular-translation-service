/**
 * ats editor — Bun HTTP server for the Translation Editor.
 *
 * Serves a self-contained web UI and REST API for managing i18n JSON files.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync } from 'fs';
import { join, resolve, relative } from 'path';
import { discoverI18nDir, type DiscoveryResult } from './discover';
import { loadNamespaces, collectFlatKeys, writeJsonFile, findFiles } from './utils';
import { extractKeysFromSource } from './check';
import { getEditorHTML } from './editor-ui';

interface EditorOptions {
    input?: string;
    port: string;
    src?: string;
}

export async function startEditor(options: EditorOptions): Promise<void> {
    const cwd = process.cwd();
    const port = parseInt(options.port, 10);

    // Discover i18n directory
    const discovery = discoverI18nDir(cwd, options.input);
    if (!discovery) {
        console.error('❌ Could not find an i18n directory.');
        console.error('   Tried: angular.json, src/i18n/, src/assets/i18n/, i18n/');
        console.error('   Use --input to specify the path manually.');
        process.exit(1);
    }

    // Determine source directory for usage scanning
    const srcDir = resolve(options.src ?? 'src');

    console.log(`🌐 Translation Editor`);
    console.log(`   i18n dir:   ${discovery.i18nDir}`);
    console.log(`   Source dir: ${srcDir}`);
    console.log(`   Languages:  ${discovery.languages.join(', ')}`);
    console.log(`   Source:     ${discovery.source}`);
    console.log(`   Port:       ${port}`);
    console.log('');

    // Build the HTML once
    const html = getEditorHTML();

    // Usage cache — computed async on startup, refreshed on demand
    let usageCache: Record<string, UsageEntry[]> | null = null;

    // Start the Bun HTTP server
    const server = Bun.serve({
        port,
        idleTimeout: 255, // max allowed — LLM inference can be slow
        async fetch(req) {
            const url = new URL(req.url);
            const path = url.pathname;

            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            };

            if (req.method === 'OPTIONS') {
                return new Response(null, { headers: corsHeaders });
            }

            if (path.startsWith('/api/')) {
                return handleAPI(req, path, discovery, corsHeaders, srcDir, () => usageCache, (c) => { usageCache = c; });
            }

            return new Response(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
            });
        },
    });

    console.log(`✅ Editor running at http://localhost:${server.port}`);
    console.log('   Press Ctrl+C to stop.\n');

    // Kick off async usage scan in the background
    console.log('   🔍 Scanning source code for key usage...');
    scanUsage(srcDir, discovery).then((cache) => {
        usageCache = cache;
        const totalRefs = Object.values(cache).reduce((sum, entries) => sum + entries.length, 0);
        console.log(`   ✅ Found ${totalRefs} key references across ${Object.keys(cache).length} unique keys.`);
    }).catch((err) => {
        console.error('   ⚠️  Usage scan failed:', err);
    });

    // Try to open browser
    try {
        const proc = Bun.spawn(['open', `http://localhost:${server.port}`], {
            stderr: 'ignore', stdout: 'ignore',
        });
        await proc.exited;
    } catch {
        try {
            Bun.spawn(['xdg-open', `http://localhost:${server.port}`], {
                stderr: 'ignore', stdout: 'ignore',
            });
        } catch {
            // Silently ignore
        }
    }
}

// ─── Usage Scanning ─────────────────────────────────────────

interface UsageEntry {
    file: string;       // relative path
    line: number;       // 1-indexed line number
    context: string;    // surrounding line content (trimmed)
}

async function scanUsage(
    srcDir: string,
    discovery: DiscoveryResult,
): Promise<Record<string, UsageEntry[]>> {
    const cache: Record<string, UsageEntry[]> = {};

    if (!existsSync(srcDir)) return cache;

    const files = findFiles(srcDir, ['.ts', '.html']);

    for (const filePath of files) {
        // Skip node_modules, dist, .spec files
        if (filePath.includes('node_modules') || filePath.includes('/dist/') || filePath.includes('.spec.')) continue;

        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const relPath = relative(process.cwd(), filePath);

        // Scan each line for key patterns
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const extracted = extractKeysFromSource(line);

            for (const key of extracted.keys) {
                if (!cache[key]) cache[key] = [];
                cache[key].push({
                    file: relPath,
                    line: i + 1,
                    context: line.trim(),
                });
            }

            // select('ns') scopes → track as namespace-level usage
            for (const scope of extracted.scopes) {
                const scopeKey = scope + ':*';
                if (!cache[scopeKey]) cache[scopeKey] = [];
                cache[scopeKey].push({
                    file: relPath,
                    line: i + 1,
                    context: line.trim(),
                });
            }
        }
    }

    return cache;
}

// ─── API Handler ────────────────────────────────────────────

async function handleAPI(
    req: Request,
    path: string,
    discovery: DiscoveryResult,
    corsHeaders: Record<string, string>,
    srcDir: string,
    getUsageCache: () => Record<string, UsageEntry[]> | null,
    setUsageCache: (c: Record<string, UsageEntry[]>) => void,
): Promise<Response> {
    try {
        // GET /api/config
        if (path === '/api/config' && req.method === 'GET') {
            const namespaceInfo: Record<string, string[]> = {};
            for (const lang of discovery.languages) {
                const langDir = join(discovery.i18nDir, lang);
                if (!existsSync(langDir)) { namespaceInfo[lang] = []; continue; }
                const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));
                namespaceInfo[lang] = files.map((f) => f.replace('.json', ''));
            }

            const allNamespaces = [...new Set(Object.values(namespaceInfo).flat())].sort();

            return Response.json({
                i18nDir: discovery.i18nDir,
                languages: discovery.languages,
                namespaces: allNamespaces,
                namespacesPerLang: namespaceInfo,
            }, { headers: corsHeaders });
        }

        // GET /api/translations/:lang/:ns
        const getMatch = path.match(/^\/api\/translations\/([^/]+)\/([^/]+)$/);
        if (getMatch && req.method === 'GET') {
            const [, lang, ns] = getMatch;
            const filePath = join(discovery.i18nDir, lang, `${ns}.json`);

            if (!existsSync(filePath)) {
                return Response.json({ data: {} }, { headers: corsHeaders });
            }

            const data = JSON.parse(readFileSync(filePath, 'utf-8'));
            return Response.json({ data }, { headers: corsHeaders });
        }

        // PUT /api/translations/:lang/:ns
        const putMatch = path.match(/^\/api\/translations\/([^/]+)\/([^/]+)$/);
        if (putMatch && req.method === 'PUT') {
            const [, lang, ns] = putMatch;
            const filePath = join(discovery.i18nDir, lang, `${ns}.json`);
            const body = await req.json() as { data: Record<string, unknown> };

            writeJsonFile(filePath, body.data);
            console.log(`   💾 Saved ${lang}/${ns}.json`);

            return Response.json({ ok: true }, { headers: corsHeaders });
        }

        // GET /api/progress — overall translation progress
        if (path === '/api/progress' && req.method === 'GET') {
            const defaultLang = discovery.languages[0];
            const defaultDir = join(discovery.i18nDir, defaultLang);

            // Count reference keys
            const refFiles = existsSync(defaultDir)
                ? readdirSync(defaultDir).filter((f) => f.endsWith('.json'))
                : [];

            const refKeys: Record<string, string[]> = {};
            let totalRefKeys = 0;
            for (const file of refFiles) {
                const ns = file.replace('.json', '');
                const data = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
                const keys = collectFlatKeys(data);
                refKeys[ns] = keys;
                totalRefKeys += keys.length;
            }

            // Per-language completion
            const progress: Record<string, { translated: number; total: number; percentage: number; byNamespace: Record<string, { translated: number; total: number }> }> = {};

            for (const lang of discovery.languages) {
                const langDir = join(discovery.i18nDir, lang);
                let translated = 0;
                const byNamespace: Record<string, { translated: number; total: number }> = {};

                for (const [ns, keys] of Object.entries(refKeys)) {
                    const filePath = join(langDir, `${ns}.json`);
                    let nsTranslated = 0;

                    if (existsSync(filePath)) {
                        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
                        for (const key of keys) {
                            const val = getNestedValue(data, key);
                            if (typeof val === 'string' && val !== '') nsTranslated++;
                        }
                    }

                    byNamespace[ns] = { translated: nsTranslated, total: keys.length };
                    translated += nsTranslated;
                }

                const pct = totalRefKeys > 0 ? Math.round((translated / totalRefKeys) * 100) : 100;
                progress[lang] = { translated, total: totalRefKeys, percentage: pct, byNamespace };
            }

            return Response.json({ progress, defaultLang }, { headers: corsHeaders });
        }

        // GET /api/usage — key usage data (async, may not be ready yet)
        if (path === '/api/usage' && req.method === 'GET') {
            const cache = getUsageCache();
            if (!cache) {
                return Response.json({ ready: false, usage: {} }, { headers: corsHeaders });
            }
            return Response.json({ ready: true, usage: cache }, { headers: corsHeaders });
        }

        // POST /api/usage/refresh — force rescan
        if (path === '/api/usage/refresh' && req.method === 'POST') {
            const cache = await scanUsage(srcDir, discovery);
            setUsageCache(cache);
            return Response.json({ ready: true, usage: cache }, { headers: corsHeaders });
        }

        // POST /api/add-key
        if (path === '/api/add-key' && req.method === 'POST') {
            const body = await req.json() as { namespace: string; key: string; values: Record<string, string> };

            for (const lang of discovery.languages) {
                const filePath = join(discovery.i18nDir, lang, `${body.namespace}.json`);
                let data: Record<string, unknown> = {};
                if (existsSync(filePath)) {
                    data = JSON.parse(readFileSync(filePath, 'utf-8'));
                }

                const parts = body.key.split('.');
                let current = data;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]] as Record<string, unknown>;
                }
                current[parts[parts.length - 1]] = body.values[lang] ?? '';

                writeJsonFile(filePath, data);
            }

            console.log(`   ➕ Added key ${body.namespace}:${body.key}`);
            return Response.json({ ok: true }, { headers: corsHeaders });
        }

        // POST /api/delete-key
        if (path === '/api/delete-key' && req.method === 'POST') {
            const body = await req.json() as { namespace: string; key: string };

            for (const lang of discovery.languages) {
                const filePath = join(discovery.i18nDir, lang, `${body.namespace}.json`);
                if (!existsSync(filePath)) continue;

                const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
                removeNestedKey(data, body.key);
                writeJsonFile(filePath, data);
            }

            console.log(`   🗑️  Deleted key ${body.namespace}:${body.key}`);
            return Response.json({ ok: true }, { headers: corsHeaders });
        }

        // POST /api/add-language — add a new language
        if (path === '/api/add-language' && req.method === 'POST') {
            const body = await req.json() as { code: string };
            const langCode = body.code.trim();
            if (!langCode) {
                return Response.json({ error: 'Language code required' }, { status: 400, headers: corsHeaders });
            }

            const langDir = join(discovery.i18nDir, langCode);
            if (existsSync(langDir)) {
                return Response.json({ error: 'Language already exists' }, { status: 400, headers: corsHeaders });
            }

            mkdirSync(langDir, { recursive: true });
            const defaultLang = discovery.languages[0];
            const defaultDir = join(discovery.i18nDir, defaultLang);
            const files = readdirSync(defaultDir).filter((f) => f.endsWith('.json'));

            for (const file of files) {
                const data = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
                const emptied = emptyValues(data);
                writeJsonFile(join(langDir, file), emptied);
            }

            discovery.languages.push(langCode);
            discovery.languages.sort();

            console.log(`   🌍 Added language: ${langCode}`);
            return Response.json({ ok: true, languages: discovery.languages }, { headers: corsHeaders });
        }

        // GET /api/ollama-status — check if Ollama is reachable
        if (path === '/api/ollama-status' && req.method === 'GET') {
            const host = new URL(req.url).searchParams.get('host') || 'localhost:11434';
            try {
                const res = await fetch(`http://${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
                if (!res.ok) throw new Error('not ok');
                const data = await res.json() as { models?: Array<{ name: string }> };
                const models = (data.models || []).map((m: { name: string }) => m.name);
                return Response.json({ online: true, models }, { headers: corsHeaders });
            } catch {
                return Response.json({ online: false, models: [] }, { headers: corsHeaders });
            }
        }

        // POST /api/translate — LLM translate via Ollama (SSE stream)
        if (path === '/api/translate' && req.method === 'POST') {
            const body = await req.json() as {
                entries: Array<{ key: string; value: string }>;
                sourceLang: string;
                targetLang: string;
                namespace: string;
                model: string;
                host: string;
                batchSize?: number;
            };

            const batchSize = body.batchSize || 20;
            const totalEntries = body.entries.length;
            const totalBatches = Math.ceil(totalEntries / batchSize);
            console.log(`   🤖 Translating ${totalEntries} keys in ${totalBatches} batch(es) (${body.sourceLang} → ${body.targetLang}) via ${body.model}...`);

            const stream = new ReadableStream({
                async start(controller) {
                    const send = (event: string, data: unknown) => {
                        controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
                    };

                    const filePath = join(discovery.i18nDir, body.targetLang, `${body.namespace}.json`);
                    let fileData: Record<string, unknown> = {};
                    if (existsSync(filePath)) {
                        fileData = JSON.parse(readFileSync(filePath, 'utf-8'));
                    }

                    let totalApplied = 0;

                    for (let i = 0; i < totalEntries; i += batchSize) {
                        const batch = body.entries.slice(i, i + batchSize);
                        const batchNum = Math.floor(i / batchSize) + 1;
                        const keys = batch.map(e => e.key).join(', ');

                        send('status', {
                            phase: 'thinking',
                            batch: batchNum,
                            totalBatches,
                            keys: batch.length,
                            message: `Batch ${batchNum}/${totalBatches} — thinking (${batch.length} keys)...`,
                        });

                        try {
                            const translations = await callOllama(
                                batch,
                                body.sourceLang,
                                body.targetLang,
                                body.model,
                                body.host,
                            );

                            // Apply and save after each batch
                            let batchApplied = 0;
                            for (const [key, translated] of Object.entries(translations)) {
                                if (typeof translated === 'string' && translated.trim()) {
                                    setNestedValue2(fileData, key, translated);
                                    batchApplied++;
                                }
                            }
                            totalApplied += batchApplied;
                            writeJsonFile(filePath, fileData);

                            send('batch', {
                                batch: batchNum,
                                totalBatches,
                                translations,
                                applied: batchApplied,
                                totalApplied,
                                namespace: body.namespace,
                            });

                            console.log(`   ✅ Batch ${batchNum}/${totalBatches}: applied ${batchApplied} keys.`);
                        } catch (err) {
                            send('error', {
                                batch: batchNum,
                                message: (err as Error).message,
                            });
                            console.error(`   ❌ Batch ${batchNum} failed: ${(err as Error).message}`);
                        }
                    }

                    send('done', { totalApplied, total: totalEntries });
                    console.log(`   ✅ All done: ${totalApplied}/${totalEntries} translations applied.`);
                    controller.close();
                },
            });

            return new Response(stream, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // GET /api/validate — structural validation across languages
        if (path === '/api/validate' && req.method === 'GET') {
            const defaultLang = discovery.languages[0];
            const defaultDir = join(discovery.i18nDir, defaultLang);
            const refFiles = existsSync(defaultDir)
                ? readdirSync(defaultDir).filter((f) => f.endsWith('.json'))
                : [];

            const issues: Array<{
                lang: string;
                namespace: string;
                type: 'missing' | 'extra' | 'empty';
                key: string;
            }> = [];

            for (const file of refFiles) {
                const ns = file.replace('.json', '');
                const refData = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
                const refKeys = new Set(collectFlatKeys(refData));

                for (const lang of discovery.languages) {
                    if (lang === defaultLang) continue;
                    const langFile = join(discovery.i18nDir, lang, file);
                    if (!existsSync(langFile)) {
                        for (const key of refKeys) {
                            issues.push({ lang, namespace: ns, type: 'missing', key });
                        }
                        continue;
                    }

                    const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
                    const langKeys = new Set(collectFlatKeys(langData));

                    // Missing in target
                    for (const key of refKeys) {
                        if (!langKeys.has(key)) {
                            issues.push({ lang, namespace: ns, type: 'missing', key });
                        }
                    }

                    // Extra in target
                    for (const key of langKeys) {
                        if (!refKeys.has(key)) {
                            issues.push({ lang, namespace: ns, type: 'extra', key });
                        }
                    }

                    // Empty values
                    for (const key of refKeys) {
                        if (langKeys.has(key)) {
                            const val = getNestedValue(langData, key);
                            if (val === '') {
                                issues.push({ lang, namespace: ns, type: 'empty', key });
                            }
                        }
                    }
                }
            }

            return Response.json({
                defaultLang,
                totalIssues: issues.length,
                issues,
            }, { headers: corsHeaders });
        }

        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (err) {
        console.error('API error:', err);
        return Response.json(
            { error: (err as Error).message },
            { status: 500, headers: corsHeaders },
        );
    }
}

// ─── Helpers ────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const p of parts) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = (current as Record<string, unknown>)[p];
    }
    return current;
}

function removeNestedKey(obj: Record<string, unknown>, path: string): void {
    const parts = path.split('.');
    let current: unknown = obj;
    const stack: Array<{ obj: Record<string, unknown>; key: string }> = [];

    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current !== 'object' || current === null) break;
        stack.push({ obj: current as Record<string, unknown>, key: parts[i] });
        current = (current as Record<string, unknown>)[parts[i]];
    }

    if (typeof current === 'object' && current !== null) {
        delete (current as Record<string, unknown>)[parts[parts.length - 1]];
        for (let i = stack.length - 1; i >= 0; i--) {
            const parent = stack[i];
            const child = parent.obj[parent.key];
            if (typeof child === 'object' && child !== null && Object.keys(child).length === 0) {
                delete parent.obj[parent.key];
            }
        }
    }
}

function emptyValues(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
            result[k] = '';
        } else if (typeof v === 'object' && v !== null) {
            result[k] = emptyValues(v as Record<string, unknown>);
        } else {
            result[k] = v;
        }
    }
    return result;
}

function setNestedValue2(obj: Record<string, unknown>, path: string, value: string): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
}

// ─── LLM Translation ───────────────────────────────────────

interface OllamaResponse {
    response: string;
    done: boolean;
}

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
            options: { temperature: 0.2 },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return parseJsonResponse(data.response);
}

function parseJsonResponse(text: string): Record<string, string> {
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

