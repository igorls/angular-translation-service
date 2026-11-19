/**
 * Shared utilities for CLI commands.
 * Zero-dependency: fs/path only.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';

/**
 * Loads all JSON namespace files from a directory.
 * Returns a Map of namespace name → parsed data.
 */
export function loadNamespaces(dir: string): Map<string, Record<string, unknown>> {
    const absDir = resolve(dir);
    if (!existsSync(absDir)) {
        throw new Error(`Directory not found: ${absDir}`);
    }

    const result = new Map<string, Record<string, unknown>>();
    const files = readdirSync(absDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
        const ns = file.replace('.json', '');
        const filePath = join(absDir, file);
        const raw = readFileSync(filePath, 'utf-8');
        try {
            const content = JSON.parse(raw);
            if (typeof content !== 'object' || content === null || Array.isArray(content)) {
                throw new Error('expected a JSON object');
            }
            result.set(ns, content as Record<string, unknown>);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            throw new Error(`Malformed JSON in ${filePath}: ${reason}`);
        }
    }

    return result;
}

/**
 * Flattens nested JSON into dotted key paths.
 *
 * Example: { nav: { home: "Home" } } → ["nav.home"]
 */
export function collectFlatKeys(obj: unknown, prefix = ''): string[] {
    if (typeof obj !== 'object' || obj === null) return [];

    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string' || typeof value === 'number') {
            keys.push(fullKey);
        } else if (typeof value === 'object' && value !== null) {
            keys.push(...collectFlatKeys(value, fullKey));
        }
    }
    return keys;
}

/**
 * Writes JSON with consistent formatting: 2-space indent + trailing newline.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Recursively finds all files matching given extensions in a directory.
 */
export function findFiles(dir: string, extensions: string[]): string[] {
    const absDir = resolve(dir);
    if (!existsSync(absDir)) return [];

    const results: string[] = [];

    function walk(currentDir: string) {
        const entries = readdirSync(currentDir);

        for (const entry of entries) {
            // Skip common non-source dirs
            if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.angular') continue;

            const fullPath = join(currentDir, entry);
            let stat;
            try {
                stat = statSync(fullPath);
            } catch {
                // Broken symlinks and unreadable entries should not abort the scan.
                continue;
            }

            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (extensions.includes(extname(entry))) {
                results.push(fullPath);
            }
        }
    }

    walk(absDir);
    return results;
}

/**
 * Resolves a value at a dotted key path in a nested object.
 * Uses longest-match at each level so JSON keys that contain literal dots
 * (e.g. `"lead.captured"`) resolve for path `eventLabels.lead.captured`.
 * Returns undefined if the path doesn't exist.
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return obj;
    const parts = path.split('.');
    let current: unknown = obj;
    let i = 0;

    while (i < parts.length) {
        if (typeof current !== 'object' || current === null) return undefined;
        const record = current as Record<string, unknown>;
        let matched = false;
        for (let end = parts.length; end > i; end--) {
            const candidate = parts.slice(i, end).join('.');
            if (Object.prototype.hasOwnProperty.call(record, candidate)) {
                current = record[candidate];
                i = end;
                matched = true;
                break;
            }
        }
        if (!matched) return undefined;
    }

    return current;
}

/**
 * Sets a value at a dotted key path in a nested object.
 * Creates intermediate objects as needed.
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    if (parts.length === 0) return;
    let current = obj;
    let i = 0;

    // Follow an existing longest-match key (so `"lead.captured"` is updated
    // in place) and only create single-segment objects for missing tails.
    while (i < parts.length - 1) {
        let matchedEnd = -1;
        for (let end = parts.length; end > i; end--) {
            const candidate = parts.slice(i, end).join('.');
            if (Object.prototype.hasOwnProperty.call(current, candidate)) {
                matchedEnd = end;
                break;
            }
        }
        if (matchedEnd === -1) break;
        const key = parts.slice(i, matchedEnd).join('.');
        if (matchedEnd === parts.length) {
            current[key] = value;
            return;
        }
        const next = current[key];
        if (typeof next !== 'object' || next === null || Array.isArray(next)) {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
        i = matchedEnd;
    }

    for (; i < parts.length - 1; i++) {
        const part = parts[i];
        if (typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
            current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
}

/**
 * Removes a value at a dotted key path in a nested object.
 * Cleans up empty parent objects along the way.
 */
export function removeNestedValue(obj: Record<string, unknown>, path: string): boolean {
    const parts = path.split('.');
    if (parts.length === 0 || !path) return false;
    const stack: Array<{ obj: Record<string, unknown>; key: string }> = [];
    let current: unknown = obj;
    let i = 0;

    while (i < parts.length) {
        if (typeof current !== 'object' || current === null || Array.isArray(current)) return false;
        const record = current as Record<string, unknown>;
        let matchedEnd = -1;
        for (let end = parts.length; end > i; end--) {
            const candidate = parts.slice(i, end).join('.');
            if (Object.prototype.hasOwnProperty.call(record, candidate)) {
                matchedEnd = end;
                break;
            }
        }
        if (matchedEnd === -1) return false;
        const key = parts.slice(i, matchedEnd).join('.');
        if (matchedEnd === parts.length) {
            delete record[key];
            for (let s = stack.length - 1; s >= 0; s--) {
                const parent = stack[s];
                const child = parent.obj[parent.key];
                if (
                    typeof child === 'object' &&
                    child !== null &&
                    !Array.isArray(child) &&
                    Object.keys(child).length === 0
                ) {
                    delete parent.obj[parent.key];
                } else {
                    break;
                }
            }
            return true;
        }
        stack.push({ obj: record, key });
        current = record[key];
        i = matchedEnd;
    }

    return false;
}
