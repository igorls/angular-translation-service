/**
 * Editor UI — assembles the complete HTML page and exports JS module contents
 * for serving via HTTP routes.
 *
 * JS modules are inlined at build time via js-modules.generated.ts to ensure
 * they're bundled into the CLI dist (not loaded from disk at runtime).
 */

import { CSS } from './css';
import { HTML_BODY } from './html';
import { JS_MODULE_MAP } from './js-modules.generated';

// ─── JS Module Registry ────────────────────────────────────
// All modules are embedded as string constants at build time.
// Served by the HTTP server at /editor/js/:name

export const JS_MODULES: Record<string, string> = JS_MODULE_MAP;

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
