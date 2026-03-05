/**
 * ats validate — Cross-language structural validation
 *
 * Compares translation files across languages to find:
 * - Missing keys (in default lang but not target)
 * - Extra keys (in target but not default)
 * - Type mismatches (string vs object shape differences)
 * - Empty values
 */

import { readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { loadNamespaces, collectFlatKeys } from './utils';

interface ValidateOptions {
    input: string;
}

export interface ValidationResult {
    lang: string;
    namespace: string;
    missing: string[];
    extra: string[];
    empty: string[];
}

export async function validateTranslations(options: ValidateOptions): Promise<ValidationResult[]> {
    const inputDir = resolve(options.input);

    if (!existsSync(inputDir)) {
        console.error(`❌ Input directory not found: ${inputDir}`);
        process.exit(1);
    }

    // Discover language directories
    const langDirs = readdirSync(inputDir).filter((entry) => {
        const fullPath = join(inputDir, entry);
        try {
            return existsSync(fullPath) && readdirSync(fullPath).some((f) => f.endsWith('.json'));
        } catch {
            return false;
        }
    }).sort();

    if (langDirs.length < 2) {
        console.error(`❌ Need at least 2 language directories in ${inputDir}. Found: ${langDirs.join(', ') || 'none'}`);
        process.exit(1);
    }

    // Use first directory as the reference (default language)
    const defaultLang = langDirs[0];
    const targetLangs = langDirs.slice(1);

    console.log(`🔍 Validating translations...`);
    console.log(`   Reference: ${defaultLang}`);
    console.log(`   Targets:   ${targetLangs.join(', ')}`);
    console.log('');

    const defaultNs = loadNamespaces(join(inputDir, defaultLang));
    const results: ValidationResult[] = [];
    let totalIssues = 0;

    for (const targetLang of targetLangs) {
        const targetNs = loadNamespaces(join(inputDir, targetLang));

        for (const [ns, defaultData] of defaultNs) {
            const targetData = targetNs.get(ns);
            const defaultKeys = collectFlatKeys(defaultData);

            const result: ValidationResult = {
                lang: targetLang,
                namespace: ns,
                missing: [],
                extra: [],
                empty: [],
            };

            if (!targetData) {
                // Entire namespace missing
                result.missing = defaultKeys;
            } else {
                const targetKeys = collectFlatKeys(targetData);
                const defaultSet = new Set(defaultKeys);
                const targetSet = new Set(targetKeys);

                // Missing: in default but not target
                for (const key of defaultKeys) {
                    if (!targetSet.has(key)) result.missing.push(key);
                }

                // Extra: in target but not default
                for (const key of targetKeys) {
                    if (!defaultSet.has(key)) result.extra.push(key);
                }

                // Empty values
                for (const key of targetKeys) {
                    const parts = key.split('.');
                    let value: unknown = targetData;
                    for (const part of parts) {
                        if (typeof value === 'object' && value !== null) {
                            value = (value as Record<string, unknown>)[part];
                        }
                    }
                    if (value === '') result.empty.push(key);
                }
            }

            const issues = result.missing.length + result.extra.length + result.empty.length;
            totalIssues += issues;

            if (issues > 0) {
                results.push(result);

                console.log(`📦 ${targetLang}/${ns}.json`);
                if (result.missing.length > 0) {
                    console.log(`   ❌ Missing: ${result.missing.length} keys`);
                    for (const key of result.missing.slice(0, 10)) {
                        console.log(`      - ${key}`);
                    }
                    if (result.missing.length > 10) {
                        console.log(`      ... and ${result.missing.length - 10} more`);
                    }
                }
                if (result.extra.length > 0) {
                    console.log(`   ⚠️  Extra: ${result.extra.length} keys`);
                    for (const key of result.extra.slice(0, 10)) {
                        console.log(`      - ${key}`);
                    }
                }
                if (result.empty.length > 0) {
                    console.log(`   📭 Empty: ${result.empty.length} values`);
                    for (const key of result.empty.slice(0, 10)) {
                        console.log(`      - ${key}`);
                    }
                }
                console.log('');
            }
        }

        // Check for namespaces in target that don't exist in default
        for (const [ns] of targetNs) {
            if (!defaultNs.has(ns)) {
                console.log(`📦 ${targetLang}/${ns}.json`);
                console.log(`   ⚠️  Extra namespace not in ${defaultLang}`);
                console.log('');
                totalIssues++;
            }
        }
    }

    if (totalIssues === 0) {
        console.log(`✅ All translations are structurally valid across ${langDirs.length} languages.`);
    } else {
        console.log(`⚠️  Found ${totalIssues} issue(s) across ${results.length} file(s).`);
    }

    return results;
}
