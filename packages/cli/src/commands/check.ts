/**
 * ats check — Find missing and unused translation keys
 *
 * Scans source code (.ts + .html) for translation key usage and
 * cross-references with JSON files to detect:
 * - Missing keys: referenced in code but not in JSON
 * - Unused keys: defined in JSON but never referenced in code
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { loadNamespaces, collectFlatKeys, findFiles } from './utils';

interface CheckOptions {
    i18n?: string;
    src?: string;
    namespace?: string;
}

export interface CheckResult {
    missing: string[];    // Keys used in code but not in JSON
    unused: string[];     // Keys in JSON but not used in code
    usedKeys: Set<string>;
    definedKeys: Set<string>;
}

/**
 * Extracts translation key references from source code.
 *
 * Patterns detected:
 * - translate('ns:key.path')
 * - instant('ns:key.path')
 * - 'ns:key.path' | translate  (Angular pipe)
 * - select('ns')  → marks all keys in namespace as used
 */
export function extractKeysFromSource(content: string): { keys: string[]; scopes: string[] } {
    const keys: string[] = [];
    const scopes: string[] = [];

    // translate('ns:key') and instant('ns:key')
    const methodRegex = /(?:translate|instant)\s*\(\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(content)) !== null) {
        keys.push(match[1]);
    }

    // 'ns:key' | translate (pipe syntax)
    const pipeRegex = /['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_.]+)['"]\s*\|\s*translate/g;
    while ((match = pipeRegex.exec(content)) !== null) {
        keys.push(match[1]);
    }

    // select('ns') → entire namespace used
    const selectRegex = /select\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = selectRegex.exec(content)) !== null) {
        scopes.push(match[1]);
    }

    return { keys, scopes };
}

export async function checkTranslations(options: CheckOptions): Promise<CheckResult> {
    const i18nDir = resolve(options.i18n ?? 'src/i18n/en');
    const srcDir = resolve(options.src ?? 'src');

    if (!existsSync(i18nDir)) {
        console.error(`❌ i18n directory not found: ${i18nDir}`);
        process.exit(1);
    }

    if (!existsSync(srcDir)) {
        console.error(`❌ Source directory not found: ${srcDir}`);
        process.exit(1);
    }

    console.log('🔍 Checking translations...');
    console.log(`   i18n dir: ${i18nDir}`);
    console.log(`   Source:   ${srcDir}`);
    console.log('');

    // 1. Collect all defined translation keys
    const namespaces = loadNamespaces(i18nDir);
    const definedKeys = new Set<string>();

    for (const [ns, data] of namespaces) {
        if (options.namespace && ns !== options.namespace) continue;
        for (const key of collectFlatKeys(data)) {
            definedKeys.add(`${ns}:${key}`);
        }
    }

    // 2. Scan source files for key usage
    const sourceFiles = findFiles(srcDir, ['.ts', '.html']);
    const usedKeys = new Set<string>();
    const usedScopes = new Set<string>();

    for (const file of sourceFiles) {
        // Skip spec files and node_modules
        if (file.includes('.spec.') || file.includes('node_modules')) continue;

        const content = readFileSync(file, 'utf-8');
        const { keys, scopes } = extractKeysFromSource(content);

        for (const key of keys) {
            usedKeys.add(key);
        }
        for (const scope of scopes) {
            usedScopes.add(scope);
        }
    }

    // 3. Mark all keys from scoped namespaces as used
    for (const scope of usedScopes) {
        for (const key of definedKeys) {
            if (key.startsWith(`${scope}:`)) {
                usedKeys.add(key);
            }
        }
    }

    // 4. Compare
    const missing: string[] = [];
    const unused: string[] = [];

    for (const key of usedKeys) {
        if (!definedKeys.has(key)) {
            // Only report if namespace exists (filter out false positives)
            const ns = key.split(':')[0];
            if (namespaces.has(ns) || !options.namespace) {
                missing.push(key);
            }
        }
    }

    for (const key of definedKeys) {
        if (!usedKeys.has(key)) {
            unused.push(key);
        }
    }

    // Sort for consistent output
    missing.sort();
    unused.sort();

    // 5. Report
    if (missing.length > 0) {
        console.log(`❌ Missing keys (used in code, not in JSON): ${missing.length}`);
        for (const key of missing) {
            console.log(`   - ${key}`);
        }
        console.log('');
    }

    if (unused.length > 0) {
        console.log(`⚠️  Unused keys (in JSON, not referenced in code): ${unused.length}`);
        for (const key of unused.slice(0, 20)) {
            console.log(`   - ${key}`);
        }
        if (unused.length > 20) {
            console.log(`   ... and ${unused.length - 20} more`);
        }
        console.log('');
    }

    if (missing.length === 0 && unused.length === 0) {
        console.log(`✅ All ${definedKeys.size} keys are valid — no missing or unused translations.`);
    }

    return { missing, unused, usedKeys, definedKeys };
}
