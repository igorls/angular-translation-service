/**
 * Editor UI — assembles the complete HTML page and exports JS module contents
 * for serving via HTTP routes.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { CSS } from './css';
import { HTML_BODY } from './html';

// ─── JS Module Registry ────────────────────────────────────
// Read all .js files from the js/ directory and expose them
// as a map for the HTTP server to serve at /editor/js/:name

const jsDir = join(dirname(new URL(import.meta.url).pathname), 'js');

const JS_MODULE_NAMES = [
    'helpers.js',
    'state.js',
    'api.js',
    'dropdown.js',
    'render.js',
    'panels.js',
    'events.js',
    'llm.js',
];

export const JS_MODULES: Record<string, string> = {};

for (const name of JS_MODULE_NAMES) {
    try {
        JS_MODULES[name] = readFileSync(join(jsDir, name), 'utf-8');
    } catch {
        // In Bun, import.meta.url resolves to the .ts source location
        // so the .js files should be co-located in the source tree
        console.warn(`   ⚠️  Could not load JS module: ${name}`);
    }
}

// ─── HTML Assembler ─────────────────────────────────────────

export function getEditorHTML(): string {
    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>ATS Translation Editor</title>',
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">',
        '<script src="https://unpkg.com/lucide@latest"></script>',
        '<style>',
        CSS,
        '</style>',
        '</head>',
        '<body>',
        HTML_BODY,
        '<script>lucide.createIcons();</script>',
        '<script type="module" src="/editor/js/events.js"></script>',
        '</body>',
        '</html>',
    ].join('\n');
}
