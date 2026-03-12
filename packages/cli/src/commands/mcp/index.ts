/**
 * ats mcp — MCP server for agent-controlled translation automation.
 *
 * Starts a STDIO-based MCP server that exposes the translation editor's
 * capabilities as tools. Agents can discover, translate, validate, and
 * scan without constructing LLM prompts or managing batch logic.
 *
 * Usage:
 *   ats mcp [--provider ollama] [--model gemma3:12b] [--host localhost:11434]
 */

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { discoverI18nDir } from '../discover';
import { scanUsage, runHardcodedScan } from '../editor/scanner';
import { MCPTransport } from './transport';
import { registerAllTools } from './tools';
import type { MCPContext } from './tools';
import type { LLMProvider } from '../editor/llm';
import type { UsageCache, ScanCache } from '../editor/types';

export interface MCPOptions {
    input?: string;
    src?: string;
    provider?: string;
    model?: string;
    host?: string;
    baseUrl?: string;
    apiKey?: string;
}

export async function startMCPServer(options: MCPOptions): Promise<void> {
    const cwd = process.cwd();
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
    const transport = new MCPTransport('ats-mcp', pkg.version);

    // ── Discover i18n directory ──────────────────────────────
    const discovery = discoverI18nDir(cwd, options.input);
    if (!discovery) {
        transport.log('ERROR: Could not find an i18n directory.');
        transport.log('Tried: angular.json, src/i18n/, src/assets/i18n/, i18n/');
        transport.log('Use --input to specify the path manually.');
        process.exit(1);
    }

    const srcDir = resolve(options.src ?? 'src');

    transport.log(`i18n dir: ${discovery.i18nDir}`);
    transport.log(`source dir: ${srcDir}`);
    transport.log(`languages: ${discovery.languages.join(', ')}`);
    transport.log(`LLM: ${options.provider || 'ollama'}/${options.model || 'gemma3:12b'}`);

    // ── Initial scans ───────────────────────────────────────
    let usageCache: UsageCache | null = null;
    let scanCache: ScanCache | null = null;

    try {
        usageCache = await scanUsage(srcDir, discovery);
        const totalRefs = Object.values(usageCache).reduce((sum, entries) => sum + entries.length, 0);
        transport.log(`Scanned ${Object.keys(usageCache).length} unique keys (${totalRefs} references)`);
    } catch (err) {
        transport.log(`Usage scan failed: ${(err as Error).message}`);
    }

    try {
        scanCache = await runHardcodedScan(srcDir);
        transport.log(`Found ${scanCache.candidates.length} hardcoded strings across ${scanCache.totalFiles} templates`);
    } catch (err) {
        transport.log(`Hardcoded scan failed: ${(err as Error).message}`);
    }

    // ── Build context ───────────────────────────────────────
    const ctx: MCPContext = {
        discovery,
        srcDir,
        usageCache,
        scanCache,
        llmDefaults: {
            provider: (options.provider || 'ollama') as LLMProvider,
            model: options.model || 'qwen3.5:9b',
            host: options.host || 'localhost:11434',
            baseUrl: options.baseUrl || 'https://api.openai.com',
            apiKey: options.apiKey || '',
        },
        transport,
    };

    // ── Register tools and start ────────────────────────────
    registerAllTools(transport, ctx);
    transport.start();
}
