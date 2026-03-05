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
        const content = JSON.parse(readFileSync(join(absDir, file), 'utf-8'));
        result.set(ns, content);
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
            const stat = statSync(fullPath);

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
 * Returns undefined if the path doesn't exist.
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = (current as Record<string, unknown>)[part];
    }

    return current;
}

/**
 * Sets a value at a dotted key path in a nested object.
 * Creates intermediate objects as needed.
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (typeof current[part] !== 'object' || current[part] === null) {
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
    const stack: Array<{ obj: Record<string, unknown>; key: string }> = [];
    let current: unknown = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current !== 'object' || current === null) return false;
        stack.push({ obj: current as Record<string, unknown>, key: parts[i] });
        current = (current as Record<string, unknown>)[parts[i]];
    }

    if (typeof current !== 'object' || current === null) return false;
    const lastKey = parts[parts.length - 1];
    if (!(lastKey in (current as Record<string, unknown>))) return false;

    delete (current as Record<string, unknown>)[lastKey];

    // Clean up empty parents
    for (let i = stack.length - 1; i >= 0; i--) {
        const parent = stack[i];
        const child = parent.obj[parent.key];
        if (typeof child === 'object' && child !== null && Object.keys(child).length === 0) {
            delete parent.obj[parent.key];
        } else {
            break;
        }
    }

    return true;
}
