import { existsSync, readFileSync } from 'fs';
import { relative } from 'path';
import type { DiscoveryResult } from '../discover';
import { findFiles } from '../utils';
import { extractKeysFromSource } from '../check';
import type { UsageCache, UsageEntry, ScanCache, ScanCandidate } from './types';

export async function scanUsage(
    srcDir: string,
    discovery: DiscoveryResult,
): Promise<UsageCache> {
    const cache: UsageCache = {};

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

/**
 * Run the hardcoded strings scanner and return a ScanCache.
 * Shared between boot-time pre-warm and API handler.
 */
export async function runHardcodedScan(srcDir: string, minScore = 3): Promise<ScanCache> {
    const { extractHardcodedStrings, extractTranslatableAttributes } = await import('../scan');

    const htmlFiles = findFiles(srcDir, ['.html']);
    const candidates: ScanCandidate[] = [];

    for (const filePath of htmlFiles) {
        if (filePath.includes('.spec.') || filePath.includes('.test.')) continue;
        const content = readFileSync(filePath, 'utf-8');
        const relPath = relative(process.cwd(), filePath);

        const textCandidates = extractHardcodedStrings(content, relPath);
        const attrCandidates = extractTranslatableAttributes(content, relPath);

        for (const c of [...textCandidates, ...attrCandidates]) {
            if (c.score >= minScore) {
                candidates.push({
                    text: c.text,
                    score: c.score,
                    reasons: c.reasons,
                    file: c.file,
                    line: c.line,
                    element: c.element,
                });
            }
        }
    }

    // Deduplicate
    const deduped = new Map<string, ScanCandidate>();
    for (const c of candidates) {
        const key = `${c.file}:${c.line}:${c.text}`;
        const existing = deduped.get(key);
        if (!existing || c.score > existing.score) deduped.set(key, c);
    }

    const sorted = Array.from(deduped.values())
        .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);

    return { totalFiles: htmlFiles.length, candidates: sorted };
}
