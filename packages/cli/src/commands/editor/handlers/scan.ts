import { existsSync, readFileSync } from 'fs';
import { resolve, relative } from 'path';
import { findFiles } from '../../utils';
import { runHardcodedScan } from '../scanner';
import type { HandlerContext, ScanCache } from '../types';

/** GET /api/scan — scan HTML templates for hardcoded strings */
export async function handleScan(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const url = new URL(req.url);
    const minScore = parseInt(url.searchParams.get('minScore') ?? '3', 10);

    // Use cached results or run a fresh scan
    let result = ctx.getScanCache();
    if (!result) {
        result = await runHardcodedScan(ctx.srcDir, minScore);
        ctx.setScanCache(result);
    }

    // Apply minScore filter (cache may have been built with a lower threshold)
    const filtered = result.candidates.filter(c => c.score >= minScore);

    return Response.json({
        totalFiles: result.totalFiles,
        totalCandidates: filtered.length,
        candidates: filtered,
    }, { headers: ctx.corsHeaders });
}

/** GET /api/scan/context — get source context around a finding */
export async function handleScanContext(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const url = new URL(req.url);
    const file = url.searchParams.get('file');
    const line = parseInt(url.searchParams.get('line') ?? '1', 10);
    const radius = parseInt(url.searchParams.get('radius') ?? '5', 10);

    if (!file) return Response.json({ error: 'file parameter required' }, { status: 400, headers: ctx.corsHeaders });

    const fullPath = resolve(process.cwd(), file);
    if (!existsSync(fullPath)) return Response.json({ error: 'File not found' }, { status: 404, headers: ctx.corsHeaders });

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, line - 1 - radius);
    const end = Math.min(lines.length, line - 1 + radius + 1);
    const context = [];
    for (let i = start; i < end; i++) {
        context.push({ line: i + 1, text: lines[i], highlight: i + 1 === line });
    }

    return Response.json({ file, line, context }, { headers: ctx.corsHeaders });
}

/** GET /api/scan/export — export scan results as agent-optimized JSON */
export async function handleScanExport(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const { extractHardcodedStrings, extractTranslatableAttributes } = await import('../../scan');
    const url = new URL(req.url);
    const minScore = parseInt(url.searchParams.get('minScore') ?? '5', 10);

    const htmlFiles = findFiles(ctx.srcDir, ['.html']);
    const candidates: Array<{
        text: string; score: number; reasons: string[];
        file: string; line: number; element: string;
    }> = [];

    // Cache file contents for context extraction
    const fileContents = new Map<string, string[]>();

    for (const filePath of htmlFiles) {
        if (filePath.includes('.spec.') || filePath.includes('.test.')) continue;
        const content = readFileSync(filePath, 'utf-8');
        const relPath = relative(process.cwd(), filePath);
        fileContents.set(relPath, content.split('\n'));
        const textCandidates = extractHardcodedStrings(content, relPath);
        const attrCandidates = extractTranslatableAttributes(content, relPath);
        for (const c of [...textCandidates, ...attrCandidates]) {
            if (c.score >= minScore) candidates.push(c);
        }
    }

    const deduped = new Map<string, typeof candidates[0]>();
    for (const c of candidates) {
        const key = `${c.file}:${c.line}:${c.text}`;
        const existing = deduped.get(key);
        if (!existing || c.score > existing.score) deduped.set(key, c);
    }

    const sorted = Array.from(deduped.values())
        .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);

    // Group by file and enrich each candidate
    const files: Record<string, Array<{
        line: number;
        element: string;
        score: number;
        reasons: string[];
        text: string;
        context: string;
        suggestedKey: string;
        hasInlineCode: boolean;
    }>> = {};

    // Track used keys and text→slug cache for identical string reuse
    const usedKeys = new Set<string>();
    const textToSlug = new Map<string, string>();

    for (const c of sorted) {
        const lines = fileContents.get(c.file);

        // Pre-filter code examples (inside <pre>/<code> blocks)
        if (isInsideCodeBlock(lines ?? [], c.line)) continue;

        if (!files[c.file]) files[c.file] = [];

        // Dynamic multi-line context window
        const context = getContextWindow(lines ?? [], c.line, c.text);

        // Text-derived slug keys with identical-string reuse
        const ns = deriveNamespace(c.file);
        const cacheKey = `${ns}::${c.text}`;
        let slug: string;
        if (textToSlug.has(cacheKey)) {
            slug = textToSlug.get(cacheKey)!;
        } else {
            slug = deriveSlug(c.text, ns, usedKeys);
            textToSlug.set(cacheKey, slug);
        }
        const suggestedKey = `${ns}:${slug}`;

        // hasInlineCode — check primary line only (avoid sibling contamination)
        const hasInlineCode = detectInlineCode(lines ?? [], c.line, c.text);

        files[c.file].push({
            line: c.line,
            element: c.element,
            score: c.score,
            reasons: c.reasons,
            text: c.text,
            context,
            suggestedKey,
            hasInlineCode,
        });
    }

    // Count total after filtering
    const totalCandidates = Object.values(files).reduce((sum, arr) => sum + arr.length, 0);

    const report = {
        generated: new Date().toISOString(),
        source: ctx.srcDir,
        minScore,
        totalCandidates,
        files,
    };

    return new Response(JSON.stringify(report, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': 'attachment; filename="scan-report.json"',
            ...ctx.corsHeaders,
        },
    });
}

// ─── Export Helpers ──────────────────────────────────────────

/** Derive a namespace from file path. pages/home.html → home, layout/* → common, shared/* → common */
function deriveNamespace(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1].replace(/\.html$/, '');

    // layout/*, shared/* → common
    if (parts.some(p => p === 'layout' || p === 'shared')) return 'common';

    // pages/{name}.html → name, components/{name}.html → name
    const parentDir = parts[parts.length - 2];
    if (parentDir === 'pages' || parentDir === 'components') return filename;

    // Default: use the filename as namespace
    return filename;
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'in', 'of', 'to', 'is', 'on', 'with', 'by', 'at', 'it', 'be', 'as']);

/** Generate a text-derived kebab slug from first 4 meaningful words */
function deriveSlug(text: string, ns: string, usedKeys: Set<string>): string {
    const words = text
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .map(w => w.toLowerCase())
        .filter(w => w.length > 1 && !STOP_WORDS.has(w))
        .slice(0, 4);

    let slug = words.length > 0 ? words.join('-') : 'content';

    // Ensure uniqueness within this namespace
    const baseKey = `${ns}:${slug}`;
    if (!usedKeys.has(baseKey)) {
        usedKeys.add(baseKey);
        return slug;
    }

    // Collision: append a counter
    let counter = 2;
    while (usedKeys.has(`${ns}:${slug}-${counter}`)) counter++;
    const uniqueSlug = `${slug}-${counter}`;
    usedKeys.add(`${ns}:${uniqueSlug}`);
    return uniqueSlug;
}

/** Get a context window around the finding, dynamically sized */
function getContextWindow(lines: string[], lineNum: number, text: string): string {
    const idx = lineNum - 1;
    const primaryLine = lines[idx] ?? '';

    // Normalize whitespace for a resilient single-line match
    const strippedLine = primaryLine.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
    const normText = text.substring(0, 40).replace(/\s+/g, ' ');

    if (strippedLine.includes(normText) && text.length < 80) {
        return primaryLine.trimEnd();
    }

    // Expand dynamically based on estimated text length (~60 chars/line) + 1 line padding
    const start = Math.max(0, idx - 1);
    const estimatedSpan = Math.ceil(text.length / 60);
    const end = Math.min(lines.length, idx + estimatedSpan + 1);
    return lines.slice(start, end).map(l => l.trimEnd()).join('\n');
}

/** Detect inline code on the primary line only (avoids sibling contamination) */
function detectInlineCode(lines: string[], lineNum: number, text: string): boolean {
    const primaryLine = lines[lineNum - 1] ?? '';
    if (/<code[\s>]/.test(primaryLine) || /<\/code>/.test(primaryLine)) return true;
    if (text.includes('`')) return true;
    return false;
}

/** Check if a given line is inside a <pre> or <code> block by scanning upward */
function isInsideCodeBlock(lines: string[], lineNum: number): boolean {
    let codeDepth = 0;
    let preDepth = 0;

    for (let i = 0; i < lineNum; i++) {
        const line = lines[i];
        // Count opening/closing tags (simple heuristic)
        const codeOpens = (line.match(/<code[\s>]/g) ?? []).length;
        const codeCloses = (line.match(/<\/code>/g) ?? []).length;
        const preOpens = (line.match(/<pre[\s>]/g) ?? []).length;
        const preCloses = (line.match(/<\/pre>/g) ?? []).length;

        codeDepth += codeOpens - codeCloses;
        preDepth += preOpens - preCloses;
    }

    return codeDepth > 0 || preDepth > 0;
}

