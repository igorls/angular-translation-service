/**
 * ats scan — Detect hardcoded strings in Angular HTML templates.
 *
 * Scans .html files for text content that appears to be human-readable
 * and is not already using the translation system (pipe, interpolation).
 *
 * Heuristic-based scoring with optional LLM verification via Ollama.
 */

import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFiles } from './utils';

// ─── Types ──────────────────────────────────────────────────

export interface ScanCandidate {
    /** The raw text content found */
    text: string;
    /** Heuristic confidence score (higher = more likely should be translated) */
    score: number;
    /** Reasons this was flagged */
    reasons: string[];
    /** Source file (relative path) */
    file: string;
    /** Line number (1-indexed) */
    line: number;
    /** Parent HTML element */
    element: string;
    /** Whether LLM confirmed this should be translated (null = not verified) */
    llmVerified: boolean | null;
}

export interface ScanOptions {
    src: string;
    extensions?: string;
    minScore?: string;
    verify?: boolean;
    model?: string;
    host?: string;
    json?: boolean;
}

export interface ScanResult {
    totalFiles: number;
    totalCandidates: number;
    candidates: ScanCandidate[];
}

// ─── Tags to skip entirely ──────────────────────────────────

const SKIP_TAGS = new Set([
    'code', 'pre', 'script', 'style', 'svg', 'math',
    'textarea', // usually user input
]);

/** Elements that strongly suggest translatable content */
const SEMANTIC_ELEMENTS = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'button', 'label', 'a', 'span',
    'li', 'td', 'th', 'figcaption', 'caption',
    'summary', 'legend', 'option', 'placeholder',
    'title', 'dt', 'dd',
]);

// ─── Core Scanner ───────────────────────────────────────────

/**
 * Extracts hardcoded string candidates from an HTML template.
 * Returns an array of candidates with heuristic scores.
 */
export function extractHardcodedStrings(
    html: string,
    filePath: string,
): ScanCandidate[] {
    const candidates: ScanCandidate[] = [];
    const lines = html.split('\n');

    // Track tag context via a simple stack
    const tagStack: string[] = [];
    let inSkipTag = false;
    let skipDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Process tags on this line to maintain context
        processTagContext(line, tagStack, (entering, tag) => {
            if (entering) {
                if (SKIP_TAGS.has(tag)) {
                    if (!inSkipTag) {
                        inSkipTag = true;
                        skipDepth = 1;
                    } else {
                        skipDepth++;
                    }
                }
            } else {
                if (SKIP_TAGS.has(tag) && inSkipTag) {
                    skipDepth--;
                    if (skipDepth <= 0) {
                        inSkipTag = false;
                        skipDepth = 0;
                    }
                }
            }
        });

        // Skip lines inside skip tags
        if (inSkipTag) continue;

        // Extract text content from this line
        const textSegments = extractTextFromLine(line);

        for (const segment of textSegments) {
            const { text, element } = segment;
            const result = scoreCandidate(text, element);

            if (result.score > 0) {
                candidates.push({
                    text: result.text,
                    score: result.score,
                    reasons: result.reasons,
                    file: filePath,
                    line: i + 1,
                    element,
                    llmVerified: null,
                });
            }
        }
    }

    return candidates;
}

// ─── Tag Context Tracker ────────────────────────────────────

function processTagContext(
    line: string,
    stack: string[],
    onTag: (entering: boolean, tag: string) => void,
): void {
    // Match opening and closing tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(line)) !== null) {
        const fullMatch = match[0];
        const tagName = match[1].toLowerCase();

        // Self-closing tags — no stack change
        if (fullMatch.endsWith('/>')) continue;

        if (fullMatch.startsWith('</')) {
            // Closing tag
            // Pop from stack
            const idx = stack.lastIndexOf(tagName);
            if (idx !== -1) {
                stack.splice(idx, 1);
                onTag(false, tagName);
            }
        } else {
            // Opening tag (unless it's void)
            const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
            if (!voidTags.has(tagName)) {
                stack.push(tagName);
                onTag(true, tagName);
            }
        }
    }
}

// ─── Text Extraction ────────────────────────────────────────

interface TextSegment {
    text: string;
    element: string;
}

function extractTextFromLine(line: string): TextSegment[] {
    const segments: TextSegment[] = [];

    // Determine the nearest parent element from opening tags on this line
    const parentMatch = line.match(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/);
    const parentElement = parentMatch ? parentMatch[1].toLowerCase() : 'unknown';

    // Remove complete HTML tags to get text content
    let text = line;

    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // Remove complete tags (with their attributes)
    text = text.replace(/<[^>]+>/g, ' ');

    // Remove Angular interpolation {{ ... }}
    text = text.replace(/\{\{[^}]*\}\}/g, '');

    // Remove Angular template syntax (control flow keywords on their own)
    text = text.replace(/@(if|else|for|switch|case|default|let|defer|empty|loading|placeholder|error)\b[^{]*/g, '');

    // Remove Angular pipe usage that indicates already-translated content
    // (handled by interpolation removal above — pipes are inside {{ }})

    // Remove HTML entities
    text = text.replace(/&[a-zA-Z]+;/g, '');
    text = text.replace(/&#\d+;/g, '');

    // Clean up and split by remaining whitespace boundaries
    text = text.trim();

    if (text.length > 0) {
        // Check if what's left is just punctuation, numbers, or symbols
        if (!isOnlySymbols(text)) {
            segments.push({ text, element: parentElement });
        }
    }

    return segments;
}

// ─── Scoring ────────────────────────────────────────────────

interface ScoreResult {
    text: string;
    score: number;
    reasons: string[];
}

/**
 * Score a text candidate on how likely it should be translated.
 * Higher score = more likely to need translation.
 */
export function scoreCandidate(rawText: string, element: string): ScoreResult {
    const text = rawText.trim();
    const reasons: string[] = [];
    let score = 0;

    // ── Immediate disqualifiers ─────────────
    if (text.length < 2) return { text, score: 0, reasons };

    // Pure whitespace
    if (/^\s*$/.test(text)) return { text, score: 0, reasons };

    // Purely numeric or punctuation
    if (isOnlySymbols(text)) return { text, score: 0, reasons };

    // Looks like a code identifier (camelCase, snake_case, kebab-case with dots)
    if (/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/.test(text)) return { text, score: 0, reasons };
    if (/^[a-z][a-z0-9_]+$/.test(text) && text.includes('_')) return { text, score: 0, reasons };

    // Looks like a CSS class or Angular selector
    if (/^[a-z][\w-]*$/.test(text) && text.includes('-')) return { text, score: 0, reasons };

    // Looks like a URL or path
    if (/^(https?:\/\/|\/[\w/.-]+|\.\/|\.\.\/)/i.test(text)) return { text, score: 0, reasons };

    // Starts with an unclosed HTML tag (residual from multi-line tag stripping)
    if (/^\s*<\w+/.test(text)) return { text, score: 0, reasons };

    // Contains raw attribute assignments (href="...", src="...", etc.)
    if (/\w+=["']/.test(text) && !/\s{2,}/.test(text)) return { text, score: 0, reasons };

    // Angular template bindings: (event)="...", [prop]="...", [(twoWay)]="...", *ngIf="..."
    if (/^\s*([\[\(][a-zA-Z0-9_.-]+[\]\)]|\*[a-zA-Z0-9_.-]+)\s*=/.test(text)) return { text, score: 0, reasons };

    // Looks like a CLI flag (--flag, -f, --flag-name)
    if (/^-{1,2}[\w][\w-]*(\s+\S+)?$/.test(text)) return { text, score: 0, reasons };

    // Looks like a relative file/directory path (src/foo/bar, path/to/file.ext)
    if (/^[\w.-]+\/[\w/.-]+$/.test(text)) return { text, score: 0, reasons };

    // Looks like a CLI command (bunx, bun, npx, npm, etc.)
    if (/^\s*(bunx?|npx|npm|ng|node)\s+/i.test(text)) return { text, score: 0, reasons };

    // Looks like a colon-separated identifier (model:version, namespace:key)
    if (/^[\w.-]+:[\w.-]+$/.test(text) && !text.includes(' ')) return { text, score: 0, reasons };

    // Looks like an Angular template variable reference (lowercase single-word identifier)
    // But allow capitalized single words — they're likely UI labels (e.g., "Settings", "Home")
    if (/^[a-z_$][\w$.]*$/i.test(text) && !text.includes(' ')) {
        if (!/^[A-Z]/.test(text) || !SEMANTIC_ELEMENTS.has(element)) {
            return { text, score: 0, reasons };
        }
    }

    // ── Positive signals ────────────────────

    // Contains spaces (multi-word = very likely human text)
    if (/\s/.test(text) && text.split(/\s+/).length >= 2) {
        score += 3;
        reasons.push('multi-word');
    }

    // Starts with uppercase (sentence/label pattern)
    if (/^[A-Z]/.test(text)) {
        score += 1;
        reasons.push('sentence-case');
    }

    // Inside a semantic element
    if (SEMANTIC_ELEMENTS.has(element)) {
        score += 2;
        reasons.push(`<${element}>`);
    }

    // Longer text is more likely to be translatable prose
    if (text.length > 20) {
        score += 1;
        reasons.push('long-text');
    }
    if (text.length > 50) {
        score += 1;
        reasons.push('paragraph-length');
    }

    // Contains common UI vocabulary
    const uiPatterns = /\b(click|submit|cancel|save|delete|edit|add|remove|close|open|view|back|next|previous|loading|error|success|warning|search|filter|sort|settings|preferences|account|profile|sign|log|password|email|username|welcome|hello|confirm|accept|decline|select|choose|upload|download|retry|continue|done|finish|help|about|contact|privacy|terms|home|menu|navigation|language|theme|dark|light)\b/i;
    if (uiPatterns.test(text)) {
        score += 1;
        reasons.push('ui-vocabulary');
    }

    // HTML attribute values that need translation (title, alt, aria-label, placeholder)
    // (these would be caught differently — this handles text nodes)

    // If we have some signals but the text is very short (single word without context)
    if (score > 0 && text.split(/\s+/).length === 1 && !SEMANTIC_ELEMENTS.has(element)) {
        score = Math.max(1, score - 1);
        reasons.push('single-word-penalty');
    }

    return { text, score, reasons };
}

// ─── Helpers ────────────────────────────────────────────────

function isOnlySymbols(text: string): boolean {
    // Only punctuation, numbers, symbols, whitespace, and common operators
    return /^[\s\d\p{P}\p{S}+\-*/=<>|&^~!@#$%()[\]{},.:;?'"\\`]+$/u.test(text);
}

// ─── Attribute Scanner ──────────────────────────────────────

/**
 * Extracts translatable attributes from HTML tags.
 * Checks: title, alt, aria-label, placeholder, aria-description
 */
export function extractTranslatableAttributes(
    html: string,
    filePath: string,
): ScanCandidate[] {
    const candidates: ScanCandidate[] = [];
    const lines = html.split('\n');

    const attrNames = ['title', 'alt', 'aria-label', 'placeholder', 'aria-description', 'aria-placeholder'];
    // Build regex: attr="value" (not [attr] which is Angular binding)
    const attrRegex = new RegExp(
        `(?<!\\[)\\b(${attrNames.join('|')})\\s*=\\s*["']([^"']+)["']`,
        'gi',
    );

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match: RegExpExecArray | null;

        // Reset regex
        attrRegex.lastIndex = 0;

        while ((match = attrRegex.exec(line)) !== null) {
            const attrName = match[1].toLowerCase();
            const value = match[2].trim();

            // Skip interpolated values
            if (value.includes('{{')) continue;

            // Skip empty
            if (!value || value.length < 2) continue;

            // Skip URLs, paths, and codes
            if (/^(https?:\/\/|\/[\w/.-]+|#[\w-]+)/.test(value)) continue;

            // Skip image filenames
            if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(value)) continue;

            const result = scoreCandidate(value, attrName);

            // Attributes are inherently translatable, boost score
            const boostedScore = Math.max(result.score, 2) + 1;

            candidates.push({
                text: value,
                score: boostedScore,
                reasons: [...result.reasons, `attr:${attrName}`],
                file: filePath,
                line: i + 1,
                element: attrName,
                llmVerified: null,
            });
        }
    }

    return candidates;
}

// ─── LLM Verification ──────────────────────────────────────

interface OllamaResponse {
    response: string;
    done: boolean;
}

export async function verifyWithLLM(
    candidates: ScanCandidate[],
    model: string,
    host: string,
): Promise<ScanCandidate[]> {
    // Batch candidates into groups of 30
    const batchSize = 30;
    const results: ScanCandidate[] = [];

    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(candidates.length / batchSize);

        process.stdout.write(`\r   🤖 LLM verifying batch ${batchNum}/${totalBatches}...`);

        const entries = batch.map((c, idx) => ({
            id: idx,
            text: c.text,
            element: c.element,
            file: c.file,
        }));

        const prompt = `You are analyzing Angular HTML template strings to determine which ones should be translated for internationalization (i18n).

For each entry, classify as:
- "translate" — Human-readable text that should be translated (labels, headings, descriptions, error messages, button text)
- "skip" — Technical content that should NOT be translated (code, identifiers, brand names, URLs, file paths, CSS classes, placeholder values, Angular syntax)

Input entries:
${JSON.stringify(entries, null, 2)}

Reply with ONLY a JSON array of objects: [{ "id": 0, "verdict": "translate" }, ...]
No explanation, no markdown fences.`;

        try {
            const response = await fetch(`http://${host}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: { temperature: 0.1 },
                }),
            });

            if (!response.ok) {
                console.error(`\n   ⚠️  LLM API error: ${response.status} — skipping verification`);
                results.push(...batch);
                continue;
            }

            const data = (await response.json()) as OllamaResponse;
            const verdicts = parseLLMVerdicts(data.response);

            for (let j = 0; j < batch.length; j++) {
                const candidate = { ...batch[j] };
                const verdict = verdicts.find((v) => v.id === j);
                candidate.llmVerified = verdict ? verdict.verdict === 'translate' : null;
                results.push(candidate);
            }
        } catch (err) {
            console.error(`\n   ⚠️  LLM error: ${(err as Error).message}`);
            results.push(...batch.map((c) => ({ ...c, llmVerified: null })));
        }
    }

    if (candidates.length > 0) {
        process.stdout.write('\n');
    }

    return results;
}

function parseLLMVerdicts(text: string): Array<{ id: number; verdict: string }> {
    try {
        return JSON.parse(text);
    } catch { /* fall through */ }

    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch { /* fall through */ }
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch { /* fall through */ }
    }

    return [];
}

// ─── Main Entry Point ───────────────────────────────────────

export async function scanTemplates(options: ScanOptions): Promise<ScanResult> {
    const srcDir = resolve(options.src ?? 'src');
    const extensions = (options.extensions ?? '.html').split(',').map((e) => e.trim());
    const minScore = parseInt(options.minScore ?? '2', 10);

    console.log('🔍 Scanning for hardcoded strings...');
    console.log(`   Source:     ${srcDir}`);
    console.log(`   Extensions: ${extensions.join(', ')}`);
    console.log(`   Min score:  ${minScore}`);
    console.log('');

    const files = findFiles(srcDir, extensions);
    let allCandidates: ScanCandidate[] = [];

    for (const filePath of files) {
        // Skip spec/test files
        if (filePath.includes('.spec.') || filePath.includes('.test.')) continue;

        const content = readFileSync(filePath, 'utf-8');
        const relPath = relative(process.cwd(), filePath);

        // Extract text content candidates
        const textCandidates = extractHardcodedStrings(content, relPath);

        // Extract translatable attribute candidates
        const attrCandidates = extractTranslatableAttributes(content, relPath);

        allCandidates.push(...textCandidates, ...attrCandidates);
    }

    // Filter by minimum score
    allCandidates = allCandidates.filter((c) => c.score >= minScore);

    // Deduplicate same text in same file
    const deduped = new Map<string, ScanCandidate>();
    for (const c of allCandidates) {
        const key = `${c.file}:${c.line}:${c.text}`;
        const existing = deduped.get(key);
        if (!existing || c.score > existing.score) {
            deduped.set(key, c);
        }
    }
    allCandidates = Array.from(deduped.values());

    // Sort by score (highest first), then by file
    allCandidates.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);

    // Optional LLM verification
    if (options.verify && allCandidates.length > 0) {
        const model = options.model ?? 'gemma3:12b';
        const host = options.host ?? '127.0.0.1:11434';
        console.log(`   🤖 Verifying ${allCandidates.length} candidates with ${model}...`);
        allCandidates = await verifyWithLLM(allCandidates, model, host);
    }

    // Output
    const result: ScanResult = {
        totalFiles: files.length,
        totalCandidates: allCandidates.length,
        candidates: allCandidates,
    };

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        printResults(result, options.verify ?? false);
    }

    return result;
}

// ─── Pretty Output ──────────────────────────────────────────

function printResults(result: ScanResult, verified: boolean): void {
    if (result.totalCandidates === 0) {
        console.log('✅ No hardcoded strings found!');
        console.log(`   Scanned ${result.totalFiles} files.`);
        return;
    }

    // Group by file
    const byFile = new Map<string, ScanCandidate[]>();
    for (const c of result.candidates) {
        const list = byFile.get(c.file) ?? [];
        list.push(c);
        byFile.set(c.file, list);
    }

    let confirmedCount = 0;
    let skippedCount = 0;

    for (const [file, candidates] of byFile) {
        console.log(`📄 ${file}`);

        for (const c of candidates) {
            const scoreBar = '█'.repeat(Math.min(c.score, 8)) + '░'.repeat(Math.max(0, 8 - c.score));
            const truncText = c.text.length > 60 ? c.text.substring(0, 57) + '...' : c.text;

            let llmIcon = '';
            if (verified) {
                if (c.llmVerified === true) {
                    llmIcon = ' ✅';
                    confirmedCount++;
                } else if (c.llmVerified === false) {
                    llmIcon = ' ⛔';
                    skippedCount++;
                } else {
                    llmIcon = ' ❓';
                }
            }

            console.log(`   L${String(c.line).padStart(4)} │ ${scoreBar} │ <${c.element}> "${truncText}"${llmIcon}`);
            if (c.reasons.length > 0) {
                console.log(`         │          │ ${c.reasons.join(', ')}`);
            }
        }
        console.log('');
    }

    console.log(`Found ${result.totalCandidates} candidates across ${byFile.size} files (${result.totalFiles} scanned).`);

    if (verified) {
        console.log(`   ✅ LLM confirmed: ${confirmedCount}  ⛔ LLM rejected: ${skippedCount}`);
    }
}
