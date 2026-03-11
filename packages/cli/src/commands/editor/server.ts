/**
 * ats editor — HTTP server for the Translation Editor.
 *
 * Serves a self-contained web UI and REST API for managing i18n JSON files.
 * Compatible with Node.js and Bun runtimes.
 */

import { resolve, relative, dirname } from 'path';
import { readFileSync } from 'fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { discoverI18nDir } from '../discover';
import { readBody } from './helpers';
import { handleAPI } from './routes';
import { scanUsage, runHardcodedScan } from './scanner';
import { getEditorHTML, JS_MODULES } from './ui';
import type { EditorOptions, UsageCache, ScanCache } from './types';

// ─── ANSI helpers ───────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    underline: '\x1b[4m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
    black: '\x1b[30m',
};

function label(text: string): string {
    return `${c.dim}${text.padEnd(14)}${c.reset}`;
}

export async function startEditor(options: EditorOptions): Promise<void> {
    const cwd = process.cwd();
    const port = parseInt(options.port, 10);
    const bootStart = performance.now();

    // Discover i18n directory
    const discovery = discoverI18nDir(cwd, options.input);
    if (!discovery) {
        console.error(`\n  ${c.bgRed}${c.white}${c.bold} ERROR ${c.reset} Could not find an i18n directory.\n`);
        console.error(`  ${c.dim}Tried:${c.reset} angular.json, src/i18n/, src/assets/i18n/, i18n/`);
        console.error(`  ${c.dim}Use ${c.reset}--input${c.dim} to specify the path manually.${c.reset}\n`);
        process.exit(1);
    }

    // Determine source directory for usage scanning
    const srcDir = resolve(options.src ?? 'src');
    const relI18n = relative(cwd, discovery.i18nDir);
    const relSrc = relative(cwd, srcDir);

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

    // ── Header ──────────────────────────────────────────────
    console.log('');
    console.log(`  ${c.bold}${c.cyan}ats editor${c.reset}  ${c.dim}v${pkg.version}${c.reset}`);
    console.log(`  ${c.dim}${'─'.repeat(42)}${c.reset}`);

    // ── Config ──────────────────────────────────────────────
    console.log(`  ${label('i18n dir')}${c.white}./${relI18n}${c.reset}`);
    console.log(`  ${label('source dir')}${c.white}./${relSrc}${c.reset}`);
    console.log(`  ${label('discovered')}${c.dim}via ${c.reset}${discovery.source}`);
    console.log(`  ${label('languages')}${discovery.languages.map(l => `${c.cyan}${l}${c.reset}`).join(`${c.dim}, ${c.reset}`)}  ${c.dim}(${discovery.languages.length})${c.reset}`);
    console.log('');

    // Build the HTML once
    const html = getEditorHTML();

    // Caches — computed on startup, refreshed on demand
    let usageCache: UsageCache | null = null;
    let scanCache: ScanCache | null = null;

    // Start the Node HTTP server
    const server = createServer(async (nodeReq: IncomingMessage, nodeRes: ServerResponse) => {
        try {
            const url = new URL(nodeReq.url ?? '/', `http://localhost:${port}`);
            const path = url.pathname;

            const corsHeaders: Record<string, string> = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            };

            if (nodeReq.method === 'OPTIONS') {
                nodeRes.writeHead(204, corsHeaders);
                nodeRes.end();
                return;
            }

            // Serve JS modules for the editor UI
            if (path.startsWith('/editor/js/')) {
                const moduleName = path.replace('/editor/js/', '');
                const moduleContent = JS_MODULES[moduleName];
                if (moduleContent) {
                    nodeRes.writeHead(200, {
                        'Content-Type': 'application/javascript; charset=utf-8',
                        'Cache-Control': 'no-cache',
                        ...corsHeaders,
                    });
                    nodeRes.end(moduleContent);
                    return;
                }
            }

            // Convert Node IncomingMessage to Web Request
            const reqUrl = `http://localhost:${port}${nodeReq.url ?? '/'}`;
            let body: string | undefined;
            if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD') {
                body = await readBody(nodeReq);
            }
            const webReq = new Request(reqUrl, {
                method: nodeReq.method,
                headers: nodeReq.headers as Record<string, string>,
                body: body ?? undefined,
            });

            let response: Response;
            if (path.startsWith('/api/')) {
                response = await handleAPI(webReq, path, discovery, corsHeaders, srcDir, () => usageCache, (c) => { usageCache = c; }, () => scanCache, (c) => { scanCache = c; });
            } else {
                response = new Response(html, {
                    headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
                });
            }

            // Send Web Response back through Node ServerResponse
            const resHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => { resHeaders[key] = value; });
            nodeRes.writeHead(response.status, resHeaders);

            // Handle streaming (SSE) vs regular responses
            if (resHeaders['content-type']?.includes('text/event-stream')) {
                const reader = response.body?.getReader();
                if (reader) {
                    const decoder = new TextDecoder();
                    const pump = async () => {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            nodeRes.write(decoder.decode(value, { stream: true }));
                        }
                        nodeRes.end();
                    };
                    pump().catch(() => nodeRes.end());
                } else {
                    nodeRes.end();
                }
            } else {
                const responseBody = await response.text();
                nodeRes.end(responseBody);
            }
        } catch (err) {
            console.error('Server error:', err);
            nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
            nodeRes.end(JSON.stringify({ error: (err as Error).message }));
        }
    });

    // ── Scan & Boot ─────────────────────────────────────────
    process.stdout.write(`  ${c.dim}◌${c.reset}  Scanning source code for key usage...`);
    const scanStart = performance.now();

    try {
        const cache = await scanUsage(srcDir, discovery);
        usageCache = cache;
        const totalRefs = Object.values(cache).reduce((sum, entries) => sum + entries.length, 0);
        const scanMs = Math.round(performance.now() - scanStart);
        process.stdout.write(`\r\x1b[K`); // clear the ◌ line
        console.log(`  ${c.green}●${c.reset}  Found ${c.bold}${totalRefs}${c.reset} key references across ${c.bold}${Object.keys(cache).length}${c.reset} unique keys ${c.dim}(${scanMs}ms)${c.reset}`);
    } catch (err) {
        process.stdout.write(`\r\x1b[K`);
        console.error(`  ${c.red}●${c.reset}  ${c.yellow}Usage scan failed:${c.reset}`, err);
    }

    process.stdout.write(`  ${c.dim}◌${c.reset}  Scanning templates for hardcoded strings...`);
    const hcStart = performance.now();

    try {
        scanCache = await runHardcodedScan(srcDir);
        const hcMs = Math.round(performance.now() - hcStart);
        process.stdout.write(`\r\x1b[K`);
        const highPriority = scanCache.candidates.filter(x => x.score >= 7).length;
        console.log(`  ${c.green}●${c.reset}  Found ${c.bold}${scanCache.candidates.length}${c.reset} hardcoded strings across ${c.bold}${scanCache.totalFiles}${c.reset} templates ${c.dim}(${hcMs}ms)${c.reset}${highPriority > 0 ? `  ${c.yellow}⚠ ${highPriority} high priority${c.reset}` : ''}`);
    } catch (err) {
        process.stdout.write(`\r\x1b[K`);
        console.error(`  ${c.red}●${c.reset}  ${c.yellow}Hardcoded strings scan failed:${c.reset}`, err);
    }

    // ── Listen with auto-port fallback ───────────────────────
    const MAX_PORT_RETRIES = 10;
    let actualPort = port;

    const tryListen = (attempt: number): Promise<number> => {
        return new Promise((resolve, reject) => {
            const tryPort = port + attempt;
            server.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_RETRIES) {
                    console.log(`  ${c.yellow}⚠${c.reset}  Port ${c.bold}${tryPort}${c.reset} in use, trying ${c.bold}${tryPort + 1}${c.reset}...`);
                    server.removeAllListeners('error');
                    resolve(tryListen(attempt + 1));
                } else {
                    reject(err);
                }
            });
            server.listen(tryPort, () => {
                resolve(tryPort);
            });
        });
    };

    try {
        actualPort = await tryListen(0);
    } catch (err) {
        console.error(`\n  ${c.bgRed}${c.white}${c.bold} ERROR ${c.reset} Could not find an available port (tried ${port}–${port + MAX_PORT_RETRIES}).\n`);
        process.exit(1);
    }

    const bootMs = Math.round(performance.now() - bootStart);
    console.log(`  ${c.green}●${c.reset}  Server listening on port ${c.bold}${actualPort}${c.reset} ${c.dim}(ready in ${bootMs}ms)${c.reset}`);
    console.log('');
    console.log(`  ${c.bgGreen}${c.black}${c.bold} READY ${c.reset}  ${c.bold}${c.underline}http://localhost:${actualPort}${c.reset}`);
    console.log('');
    console.log(`  ${c.dim}Press Ctrl+C to stop.${c.reset}`);
    console.log('');

    // Try to open browser
    const openUrl = `http://localhost:${actualPort}`;
    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCmd} ${openUrl}`, () => { /* ignore errors */ });
}
