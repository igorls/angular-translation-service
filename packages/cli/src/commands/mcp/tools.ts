/**
 * MCP Tool definitions and handlers for the ATS Translation Editor.
 *
 * Each tool wraps an existing editor handler, keeping the MCP layer thin.
 * The handlers operate directly on the filesystem (i18n JSON files) and
 * the in-memory caches (usage, scan), same as the editor web UI.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { collectFlatKeys, writeJsonFile } from '../utils';
import { getNestedValue, setNestedValue, removeNestedKey } from '../editor/helpers';
import { parseProvideTranslationConfig } from '../editor/handlers/config';
import { scanUsage, runHardcodedScan } from '../editor/scanner';
import { callLLM, checkProviderStatus } from '../editor/llm';
import type { LLMProvider } from '../editor/llm';
import type { MCPToolDefinition, ToolHandler, MCPTransport } from './transport';
import type { DiscoveryResult } from '../discover';
import type { UsageCache, ScanCache } from '../editor/types';

// ─── Server Context ─────────────────────────────────────────

export interface MCPContext {
    discovery: DiscoveryResult;
    srcDir: string;
    usageCache: UsageCache | null;
    scanCache: ScanCache | null;
    llmDefaults: {
        provider: LLMProvider;
        model: string;
        host: string;
        baseUrl: string;
        apiKey: string;
    };
    transport: MCPTransport;
}

// ─── Register All Tools ─────────────────────────────────────

export function registerAllTools(transport: MCPTransport, ctx: MCPContext): void {
    const tools = buildTools(ctx);
    for (const { definition, handler } of tools) {
        transport.registerTool(definition, handler);
    }
}

function buildTools(ctx: MCPContext): Array<{ definition: MCPToolDefinition; handler: ToolHandler }> {
    return [
        // ── Introspection ───────────────────────────────────
        {
            definition: {
                name: 'get_config',
                description: 'Get project i18n configuration: languages, namespaces, defaultLang, config warnings.',
                inputSchema: { type: 'object', properties: {} },
            },
            handler: async () => handleGetConfig(ctx),
        },
        {
            definition: {
                name: 'get_progress',
                description: 'Get translation progress per language and namespace. Shows completion percentage and counts.',
                inputSchema: { type: 'object', properties: {} },
            },
            handler: async () => handleGetProgress(ctx),
        },
        {
            definition: {
                name: 'validate',
                description: 'Validate translations across all languages. Finds missing keys, extra keys, and empty values.',
                inputSchema: { type: 'object', properties: {} },
            },
            handler: async () => handleValidate(ctx),
        },
        {
            definition: {
                name: 'scan_hardcoded',
                description: 'Scan HTML templates for hardcoded strings that should be translated. Returns scored candidates with suggested keys and context.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        minScore: { type: 'number', description: 'Minimum heuristic score (1-8). Default: 5.' },
                        filterPath: { type: 'string', description: 'Optional file or folder path to limit the scan scope (relative to src dir).' },
                    },
                },
            },
            handler: async (params) => handleScanHardcoded(ctx, params),
        },

        // ── Translation CRUD ────────────────────────────────
        {
            definition: {
                name: 'get_translations',
                description: 'Get all translation key-value pairs for a specific language and namespace.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        lang: { type: 'string', description: 'Language code (e.g., "en", "fr", "pt-BR").' },
                        namespace: { type: 'string', description: 'Namespace name (e.g., "common", "home").' },
                    },
                    required: ['lang', 'namespace'],
                },
            },
            handler: async (params) => handleGetTranslations(ctx, params),
        },
        {
            definition: {
                name: 'set_translations',
                description: 'Write full translation data for a specific language and namespace. Overwrites the entire namespace file.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        lang: { type: 'string', description: 'Language code.' },
                        namespace: { type: 'string', description: 'Namespace name.' },
                        data: { type: 'object', description: 'Full JSON translation data to write.' },
                    },
                    required: ['lang', 'namespace', 'data'],
                },
            },
            handler: async (params) => handleSetTranslations(ctx, params),
        },
        {
            definition: {
                name: 'add_key',
                description: 'Add a new translation key. Only writes to languages specified in the values map — existing translations in other languages are left untouched. Creates the namespace file if it does not exist.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        namespace: { type: 'string', description: 'Namespace name.' },
                        key: { type: 'string', description: 'Dotted key path (e.g., "hero.title").' },
                        values: { type: 'object', description: 'Map of language code → translated text (e.g., {"en": "Hello", "fr": "Bonjour"}). Only languages included here will be written.' },
                    },
                    required: ['namespace', 'key', 'values'],
                },
            },
            handler: async (params) => handleAddKey(ctx, params),
        },
        {
            definition: {
                name: 'update_key',
                description: 'Update a single translation key for a single language. Does not affect other languages or keys.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        namespace: { type: 'string', description: 'Namespace name.' },
                        key: { type: 'string', description: 'Dotted key path (e.g., "hero.title").' },
                        lang: { type: 'string', description: 'Language code (e.g., "en", "fr").' },
                        value: { type: 'string', description: 'New value for the key.' },
                    },
                    required: ['namespace', 'key', 'lang', 'value'],
                },
            },
            handler: async (params) => handleUpdateKey(ctx, params),
        },
        {
            definition: {
                name: 'delete_key',
                description: 'Delete a translation key from all languages.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        namespace: { type: 'string', description: 'Namespace name.' },
                        key: { type: 'string', description: 'Dotted key path to delete.' },
                    },
                    required: ['namespace', 'key'],
                },
            },
            handler: async (params) => handleDeleteKey(ctx, params),
        },
        {
            definition: {
                name: 'list_missing',
                description: 'List translation keys that exist in the default language but are missing or empty in a target language.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        targetLang: { type: 'string', description: 'Target language code to check.' },
                        namespace: { type: 'string', description: 'Optional: limit to a specific namespace.' },
                    },
                    required: ['targetLang'],
                },
            },
            handler: async (params) => handleListMissing(ctx, params),
        },

        // ── LLM Translation ─────────────────────────────────
        {
            definition: {
                name: 'translate_keys',
                description: 'Translate specific keys from source to target language using LLM. Writes results to disk. Use this for fine-grained control over which keys to translate.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        entries: {
                            type: 'array',
                            description: 'Array of {key, value} objects to translate.',
                            items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] },
                        },
                        sourceLang: { type: 'string', description: 'Source language code.' },
                        targetLang: { type: 'string', description: 'Target language code.' },
                        namespace: { type: 'string', description: 'Namespace to write translations into.' },
                        batchSize: { type: 'number', description: 'Keys per LLM batch. Default: 20.' },
                        provider: { type: 'string', description: 'Override LLM provider (ollama/openai/gemini).' },
                        model: { type: 'string', description: 'Override LLM model name.' },
                    },
                    required: ['entries', 'sourceLang', 'targetLang', 'namespace'],
                },
            },
            handler: async (params) => handleTranslateKeys(ctx, params),
        },
        {
            definition: {
                name: 'translate_missing',
                description: 'High-level: automatically discover all missing keys for a target language and translate them via LLM. Handles batching and writing. Ideal for bulk translation of entire languages.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        targetLang: { type: 'string', description: 'Target language code to translate into.' },
                        namespace: { type: 'string', description: 'Optional: limit to a specific namespace.' },
                        filterPath: { type: 'string', description: 'Optional: limit to namespaces matching this path/pattern.' },
                        batchSize: { type: 'number', description: 'Keys per LLM batch. Default: 20.' },
                        provider: { type: 'string', description: 'Override LLM provider.' },
                        model: { type: 'string', description: 'Override LLM model.' },
                    },
                    required: ['targetLang'],
                },
            },
            handler: async (params) => handleTranslateMissing(ctx, params),
        },
        {
            definition: {
                name: 'translate_stale',
                description: 'Detect and re-translate keys where the source (default) language value has changed but target translations are still based on the old value. Uses content hashing to detect staleness. Ideal after updating source-language text.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        targetLang: { type: 'string', description: 'Target language code to re-translate.' },
                        namespace: { type: 'string', description: 'Optional: limit to a specific namespace.' },
                        batchSize: { type: 'number', description: 'Keys per LLM batch. Default: 20.' },
                        provider: { type: 'string', description: 'Override LLM provider.' },
                        model: { type: 'string', description: 'Override LLM model.' },
                    },
                    required: ['targetLang'],
                },
            },
            handler: async (params) => handleTranslateStale(ctx, params),
        },
        {
            definition: {
                name: 'llm_status',
                description: 'Check LLM provider connectivity and list available models.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        provider: { type: 'string', description: 'Override provider to check (default: configured provider).' },
                    },
                },
            },
            handler: async (params) => handleLLMStatus(ctx, params),
        },

        // ── Source Code ──────────────────────────────────────
        {
            definition: {
                name: 'get_scan_context',
                description: 'Get source code context around a specific line in a file. Useful for understanding scan findings.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        file: { type: 'string', description: 'Relative file path from project root.' },
                        line: { type: 'number', description: '1-indexed line number.' },
                        radius: { type: 'number', description: 'Number of lines above/below to include. Default: 5.' },
                    },
                    required: ['file', 'line'],
                },
            },
            handler: async (params) => handleGetScanContext(ctx, params),
        },
        {
            definition: {
                name: 'get_usage',
                description: 'Get all translation key references found in source code. Shows which keys are used in which files and lines.',
                inputSchema: { type: 'object', properties: {} },
            },
            handler: async () => handleGetUsage(ctx),
        },
    ];
}

// ─── Introspection Handlers ─────────────────────────────────

async function handleGetConfig(ctx: MCPContext) {
    const namespaceInfo: Record<string, string[]> = {};
    for (const lang of ctx.discovery.languages) {
        const langDir = join(ctx.discovery.i18nDir, lang);
        if (!existsSync(langDir)) { namespaceInfo[lang] = []; continue; }
        namespaceInfo[lang] = readdirSync(langDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    }

    const allNamespaces = [...new Set(Object.values(namespaceInfo).flat())].sort();
    const appConfig = parseProvideTranslationConfig(ctx.srcDir);

    return {
        i18nDir: ctx.discovery.i18nDir,
        languages: ctx.discovery.languages,
        namespaces: allNamespaces,
        namespacesPerLang: namespaceInfo,
        defaultLang: appConfig.defaultLang || ctx.discovery.languages[0],
        supportedLangs: appConfig.supportedLangs,
    };
}

async function handleGetProgress(ctx: MCPContext) {
    const appConfig = parseProvideTranslationConfig(ctx.srcDir);
    const defaultLang = appConfig.defaultLang || ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);

    const refFiles = existsSync(defaultDir) ? readdirSync(defaultDir).filter(f => f.endsWith('.json')) : [];
    const refKeys: Record<string, string[]> = {};
    let totalRefKeys = 0;

    for (const file of refFiles) {
        const ns = file.replace('.json', '');
        const data = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const keys = collectFlatKeys(data);
        refKeys[ns] = keys;
        totalRefKeys += keys.length;
    }

    const progress: Record<string, { translated: number; total: number; percentage: number; byNamespace: Record<string, { translated: number; total: number }> }> = {};

    for (const lang of ctx.discovery.languages) {
        const langDir = join(ctx.discovery.i18nDir, lang);
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

    return { progress, defaultLang };
}

async function handleValidate(ctx: MCPContext) {
    const defaultLang = ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);
    const refFiles = existsSync(defaultDir) ? readdirSync(defaultDir).filter(f => f.endsWith('.json')) : [];

    const issues: Array<{ lang: string; namespace: string; type: string; key: string }> = [];

    for (const file of refFiles) {
        const ns = file.replace('.json', '');
        const refData = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const refKeys = new Set(collectFlatKeys(refData));

        for (const lang of ctx.discovery.languages) {
            if (lang === defaultLang) continue;
            const langFile = join(ctx.discovery.i18nDir, lang, file);

            if (!existsSync(langFile)) {
                for (const key of refKeys) issues.push({ lang, namespace: ns, type: 'missing', key });
                continue;
            }

            const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
            const langKeys = new Set(collectFlatKeys(langData));

            for (const key of refKeys) {
                if (!langKeys.has(key)) issues.push({ lang, namespace: ns, type: 'missing', key });
            }
            for (const key of langKeys) {
                if (!refKeys.has(key)) issues.push({ lang, namespace: ns, type: 'extra', key });
            }
            for (const key of refKeys) {
                if (langKeys.has(key)) {
                    const val = getNestedValue(langData, key);
                    if (val === '') issues.push({ lang, namespace: ns, type: 'empty', key });
                }
            }
        }
    }

    return { defaultLang, totalIssues: issues.length, issues };
}

async function handleScanHardcoded(ctx: MCPContext, params: Record<string, unknown>) {
    const { extractHardcodedStrings, extractTranslatableAttributes } = await import('../scan');
    const { findFiles } = await import('../utils');
    const { relative, resolve } = await import('path');

    const minScore = (params.minScore as number) || 5;
    const filterPath = params.filterPath as string | undefined;

    // Determine scan directory
    let scanDir = ctx.srcDir;
    if (filterPath) {
        const filtered = resolve(ctx.srcDir, filterPath);
        if (existsSync(filtered)) scanDir = filtered;
    }

    const htmlFiles = findFiles(scanDir, ['.html']);
    const candidates: Array<{ text: string; score: number; reasons: string[]; file: string; line: number; element: string }> = [];

    for (const filePath of htmlFiles) {
        if (filePath.includes('.spec.') || filePath.includes('.test.')) continue;
        const content = readFileSync(filePath, 'utf-8');
        const relPath = relative(process.cwd(), filePath);
        const textCandidates = extractHardcodedStrings(content, relPath);
        const attrCandidates = extractTranslatableAttributes(content, relPath);
        for (const c of [...textCandidates, ...attrCandidates]) {
            if (c.score >= minScore) candidates.push(c);
        }
    }

    // Deduplicate
    const deduped = new Map<string, typeof candidates[0]>();
    for (const c of candidates) {
        const key = `${c.file}:${c.line}:${c.text}`;
        const existing = deduped.get(key);
        if (!existing || c.score > existing.score) deduped.set(key, c);
    }

    const sorted = Array.from(deduped.values()).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);

    return {
        totalCandidates: sorted.length,
        minScore,
        filterPath: filterPath || null,
        candidates: sorted,
    };
}

// ─── Translation CRUD Handlers ──────────────────────────────

async function handleGetTranslations(ctx: MCPContext, params: Record<string, unknown>) {
    const lang = params.lang as string;
    const ns = params.namespace as string;
    const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);

    if (!existsSync(filePath)) return { data: {} };
    return { data: JSON.parse(readFileSync(filePath, 'utf-8')) };
}

async function handleSetTranslations(ctx: MCPContext, params: Record<string, unknown>) {
    const lang = params.lang as string;
    const ns = params.namespace as string;
    const data = params.data as Record<string, unknown>;
    const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);

    writeJsonFile(filePath, data);
    ctx.transport.log(`Saved ${lang}/${ns}.json`);
    return { ok: true, file: `${lang}/${ns}.json` };
}

async function handleAddKey(ctx: MCPContext, params: Record<string, unknown>) {
    const ns = params.namespace as string;
    const key = params.key as string;
    const values = params.values as Record<string, string>;
    const langsToWrite = Object.keys(values).filter(l => ctx.discovery.languages.includes(l));

    if (langsToWrite.length === 0) {
        return { ok: false, error: 'No valid languages in values map.' };
    }

    for (const lang of langsToWrite) {
        const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);
        let data: Record<string, unknown> = {};
        if (existsSync(filePath)) data = JSON.parse(readFileSync(filePath, 'utf-8'));

        const parts = key.split('.');
        let current = data;
        for (let i = 0; i < parts.length - 1; i++) {
            if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) current[parts[i]] = {};
            current = current[parts[i]] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = values[lang];

        writeJsonFile(filePath, data);
    }

    ctx.transport.log(`Added key ${ns}:${key} for ${langsToWrite.join(', ')}`);
    return { ok: true, key: `${ns}:${key}`, languages: langsToWrite };
}

async function handleUpdateKey(ctx: MCPContext, params: Record<string, unknown>) {
    const ns = params.namespace as string;
    const key = params.key as string;
    const lang = params.lang as string;
    const value = params.value as string;

    if (!ctx.discovery.languages.includes(lang)) {
        return { ok: false, error: `Unknown language: ${lang}` };
    }

    const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);
    let data: Record<string, unknown> = {};
    if (existsSync(filePath)) data = JSON.parse(readFileSync(filePath, 'utf-8'));

    setNestedValue(data, key, value);
    writeJsonFile(filePath, data);

    ctx.transport.log(`Updated ${lang}/${ns}:${key}`);
    return { ok: true, lang, key: `${ns}:${key}` };
}

async function handleDeleteKey(ctx: MCPContext, params: Record<string, unknown>) {
    const ns = params.namespace as string;
    const key = params.key as string;

    for (const lang of ctx.discovery.languages) {
        const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);
        if (!existsSync(filePath)) continue;
        const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
        removeNestedKey(data, key);
        writeJsonFile(filePath, data);
    }

    ctx.transport.log(`Deleted key ${ns}:${key}`);
    return { ok: true, key: `${ns}:${key}` };
}

async function handleListMissing(ctx: MCPContext, params: Record<string, unknown>) {
    const targetLang = params.targetLang as string;
    const nsFilter = params.namespace as string | undefined;

    const appConfig = parseProvideTranslationConfig(ctx.srcDir);
    const defaultLang = appConfig.defaultLang || ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);

    if (!existsSync(defaultDir)) return { missing: [], total: 0 };

    const refFiles = readdirSync(defaultDir).filter(f => f.endsWith('.json'));
    const missing: Array<{ namespace: string; key: string; sourceValue: string }> = [];

    for (const file of refFiles) {
        const ns = file.replace('.json', '');
        if (nsFilter && ns !== nsFilter) continue;

        const refData = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const refKeys = collectFlatKeys(refData);

        const targetFile = join(ctx.discovery.i18nDir, targetLang, file);
        const targetData = existsSync(targetFile) ? JSON.parse(readFileSync(targetFile, 'utf-8')) : {};

        for (const key of refKeys) {
            const targetVal = getNestedValue(targetData, key);
            if (typeof targetVal !== 'string' || targetVal === '') {
                const sourceVal = getNestedValue(refData, key);
                missing.push({ namespace: ns, key, sourceValue: String(sourceVal ?? '') });
            }
        }
    }

    return { defaultLang, targetLang, total: missing.length, missing };
}

// ─── LLM Translation Handlers ──────────────────────────────

async function handleTranslateKeys(ctx: MCPContext, params: Record<string, unknown>) {
    const entries = params.entries as Array<{ key: string; value: string }>;
    const sourceLang = params.sourceLang as string;
    const targetLang = params.targetLang as string;
    const namespace = params.namespace as string;
    const batchSize = (params.batchSize as number) || 20;
    const provider = (params.provider as LLMProvider) || ctx.llmDefaults.provider;
    const model = (params.model as string) || ctx.llmDefaults.model;

    const filePath = join(ctx.discovery.i18nDir, targetLang, `${namespace}.json`);
    let fileData: Record<string, unknown> = {};
    if (existsSync(filePath)) fileData = JSON.parse(readFileSync(filePath, 'utf-8'));

    let totalApplied = 0;
    const totalEntries = entries.length;
    const totalBatches = Math.ceil(totalEntries / batchSize);
    const batchResults: Array<{ batch: number; applied: number; error?: string }> = [];

    ctx.transport.log(`Translating ${totalEntries} keys in ${totalBatches} batch(es) (${sourceLang} → ${targetLang}) via ${provider}/${model}`);

    for (let i = 0; i < totalEntries; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        try {
            const translations = await callLLM({
                entries: batch,
                sourceLang,
                targetLang,
                provider,
                model,
                config: {
                    host: ctx.llmDefaults.host,
                    baseUrl: ctx.llmDefaults.baseUrl,
                    apiKey: ctx.llmDefaults.apiKey,
                },
            });

            let batchApplied = 0;
            for (const [key, translated] of Object.entries(translations)) {
                if (typeof translated === 'string' && translated.trim()) {
                    setNestedValue(fileData, key, translated);
                    batchApplied++;
                }
            }
            totalApplied += batchApplied;
            writeJsonFile(filePath, fileData);

            // Record source-value hashes for stale detection
            recordSourceHashes(ctx, targetLang, batch, namespace);

            ctx.transport.log(`  ✓ Batch ${batchNum}/${totalBatches}: ${batchApplied} keys applied`);
            batchResults.push({ batch: batchNum, applied: batchApplied });
        } catch (err) {
            ctx.transport.log(`  ✗ Batch ${batchNum} failed: ${(err as Error).message}`);
            batchResults.push({ batch: batchNum, applied: 0, error: (err as Error).message });
        }
    }

    return {
        totalApplied,
        totalEntries,
        namespace,
        targetLang,
        batches: batchResults,
    };
}

async function handleTranslateMissing(ctx: MCPContext, params: Record<string, unknown>) {
    const targetLang = params.targetLang as string;
    const nsFilter = params.namespace as string | undefined;
    const filterPath = params.filterPath as string | undefined;
    const batchSize = (params.batchSize as number) || 20;
    const provider = (params.provider as LLMProvider) || ctx.llmDefaults.provider;
    const model = (params.model as string) || ctx.llmDefaults.model;

    // 1. Discover missing keys
    const missingResult = await handleListMissing(ctx, { targetLang, namespace: nsFilter });
    const allMissing = missingResult.missing as Array<{ namespace: string; key: string; sourceValue: string }>;

    // Optional: filter by path pattern
    let filtered = allMissing;
    if (filterPath) {
        filtered = allMissing.filter(m => m.namespace.includes(filterPath));
    }

    if (filtered.length === 0) {
        return { targetLang, totalTranslated: 0, message: 'No missing translations found.' };
    }

    // 2. Group by namespace
    const byNamespace = new Map<string, Array<{ key: string; value: string }>>();
    for (const m of filtered) {
        const entries = byNamespace.get(m.namespace) || [];
        entries.push({ key: m.key, value: m.sourceValue });
        byNamespace.set(m.namespace, entries);
    }

    // 3. Translate each namespace
    const sourceLang = missingResult.defaultLang as string;
    let totalTranslated = 0;
    const namespaceResults: Array<{ namespace: string; translated: number; total: number; error?: string }> = [];

    for (const [ns, entries] of byNamespace) {
        ctx.transport.log(`Translating ${entries.length} missing keys for ${ns} (${sourceLang} → ${targetLang})`);

        try {
            const result = await handleTranslateKeys(ctx, {
                entries,
                sourceLang,
                targetLang,
                namespace: ns,
                batchSize,
                provider,
                model,
            });
            const applied = (result as { totalApplied: number }).totalApplied;
            totalTranslated += applied;
            namespaceResults.push({ namespace: ns, translated: applied, total: entries.length });
        } catch (err) {
            namespaceResults.push({ namespace: ns, translated: 0, total: entries.length, error: (err as Error).message });
        }
    }

    return {
        targetLang,
        sourceLang,
        totalTranslated,
        totalMissing: filtered.length,
        namespaces: namespaceResults,
    };
}

// ─── Stale Translation Detection ────────────────────────────

/** Simple djb2 hash for lightweight content fingerprinting */
function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
}

function getHashFilePath(ctx: MCPContext, lang: string): string {
    return join(ctx.discovery.i18nDir, lang, '.ats-hashes.json');
}

function readHashes(ctx: MCPContext, lang: string): Record<string, string> {
    const hashFile = getHashFilePath(ctx, lang);
    if (!existsSync(hashFile)) return {};
    try {
        return JSON.parse(readFileSync(hashFile, 'utf-8'));
    } catch {
        return {};
    }
}

function writeHashes(ctx: MCPContext, lang: string, hashes: Record<string, string>): void {
    writeJsonFile(getHashFilePath(ctx, lang), hashes);
}

/** Record source-value hashes after a successful translation batch */
function recordSourceHashes(
    ctx: MCPContext,
    targetLang: string,
    entries: Array<{ key: string; value: string }>,
    namespace: string,
): void {
    const hashes = readHashes(ctx, targetLang);
    for (const { key, value } of entries) {
        hashes[`${namespace}:${key}`] = simpleHash(value);
    }
    writeHashes(ctx, targetLang, hashes);
}

async function handleTranslateStale(ctx: MCPContext, params: Record<string, unknown>) {
    const targetLang = params.targetLang as string;
    const nsFilter = params.namespace as string | undefined;
    const batchSize = (params.batchSize as number) || 20;
    const provider = (params.provider as LLMProvider) || ctx.llmDefaults.provider;
    const model = (params.model as string) || ctx.llmDefaults.model;

    const appConfig = parseProvideTranslationConfig(ctx.srcDir);
    const defaultLang = appConfig.defaultLang || ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);

    if (!existsSync(defaultDir)) return { stale: [], total: 0, message: 'Default language directory not found.' };

    const hashes = readHashes(ctx, targetLang);
    const refFiles = readdirSync(defaultDir).filter(f => f.endsWith('.json'));
    const staleEntries: Array<{ namespace: string; key: string; sourceValue: string; reason: string }> = [];

    for (const file of refFiles) {
        const ns = file.replace('.json', '');
        if (nsFilter && ns !== nsFilter) continue;

        const refData = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const refKeys = collectFlatKeys(refData);

        const targetFile = join(ctx.discovery.i18nDir, targetLang, file);
        const targetData = existsSync(targetFile) ? JSON.parse(readFileSync(targetFile, 'utf-8')) : {};

        for (const key of refKeys) {
            const sourceVal = String(getNestedValue(refData, key) ?? '');
            const targetVal = getNestedValue(targetData, key);

            // Skip if target is empty/missing — that's a job for translate_missing
            if (typeof targetVal !== 'string' || targetVal === '') continue;

            const hashKey = `${ns}:${key}`;
            const currentHash = simpleHash(sourceVal);
            const storedHash = hashes[hashKey];

            if (storedHash && storedHash !== currentHash) {
                staleEntries.push({ namespace: ns, key, sourceValue: sourceVal, reason: 'source_changed' });
            } else if (!storedHash) {
                // No hash on record — record it now (first-run bootstrapping)
                hashes[hashKey] = currentHash;
            }
        }
    }

    // Persist bootstrapped hashes even if nothing is stale
    writeHashes(ctx, targetLang, hashes);

    if (staleEntries.length === 0) {
        return { targetLang, totalStale: 0, message: 'No stale translations detected. All source hashes are up to date.' };
    }

    ctx.transport.log(`Found ${staleEntries.length} stale translation(s) for ${targetLang}`);

    // Group by namespace and translate
    const byNamespace = new Map<string, Array<{ key: string; value: string }>>();
    for (const entry of staleEntries) {
        const entries = byNamespace.get(entry.namespace) || [];
        entries.push({ key: entry.key, value: entry.sourceValue });
        byNamespace.set(entry.namespace, entries);
    }

    let totalTranslated = 0;
    const namespaceResults: Array<{ namespace: string; translated: number; total: number; error?: string }> = [];

    for (const [ns, entries] of byNamespace) {
        ctx.transport.log(`Re-translating ${entries.length} stale keys for ${ns} (${defaultLang} → ${targetLang})`);

        try {
            const result = await handleTranslateKeys(ctx, {
                entries,
                sourceLang: defaultLang,
                targetLang,
                namespace: ns,
                batchSize,
                provider,
                model,
            });
            const applied = (result as { totalApplied: number }).totalApplied;
            totalTranslated += applied;
            namespaceResults.push({ namespace: ns, translated: applied, total: entries.length });

            // Update hashes for successfully translated keys
            recordSourceHashes(ctx, targetLang, entries, ns);
        } catch (err) {
            namespaceResults.push({ namespace: ns, translated: 0, total: entries.length, error: (err as Error).message });
        }
    }

    return {
        targetLang,
        sourceLang: defaultLang,
        totalStale: staleEntries.length,
        totalTranslated,
        namespaces: namespaceResults,
    };
}

async function handleLLMStatus(ctx: MCPContext, params: Record<string, unknown>) {
    const provider = (params.provider as LLMProvider) || ctx.llmDefaults.provider;

    const result = await checkProviderStatus({
        provider,
        config: {
            host: ctx.llmDefaults.host,
            baseUrl: ctx.llmDefaults.baseUrl,
            apiKey: ctx.llmDefaults.apiKey,
        },
    });

    return { provider, ...result, configuredModel: ctx.llmDefaults.model };
}

// ─── Source Code Handlers ───────────────────────────────────

async function handleGetScanContext(_ctx: MCPContext, params: Record<string, unknown>) {
    const { resolve: resolvePath } = await import('path');
    const file = params.file as string;
    const line = (params.line as number) || 1;
    const radius = (params.radius as number) || 5;

    const fullPath = resolvePath(process.cwd(), file);
    if (!existsSync(fullPath)) throw new Error(`File not found: ${file}`);

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, line - 1 - radius);
    const end = Math.min(lines.length, line - 1 + radius + 1);

    const context = [];
    for (let i = start; i < end; i++) {
        context.push({ line: i + 1, text: lines[i], highlight: i + 1 === line });
    }

    return { file, line, context };
}

async function handleGetUsage(ctx: MCPContext) {
    if (!ctx.usageCache) {
        ctx.usageCache = await scanUsage(ctx.srcDir, ctx.discovery);
    }

    const totalRefs = Object.values(ctx.usageCache).reduce((sum, entries) => sum + entries.length, 0);
    return {
        totalKeys: Object.keys(ctx.usageCache).length,
        totalReferences: totalRefs,
        usage: ctx.usageCache,
    };
}
