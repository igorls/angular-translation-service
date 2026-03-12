/**
 * ats clean — Remove orphaned keys from translation files
 *
 * Compares target language files against the default language and removes
 * any keys in the target that don't exist in the default.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { collectFlatKeys, writeJsonFile, getNestedValue, removeNestedValue } from './utils';
import { resolveDefaultLang } from './resolve-default-lang';

interface CleanOptions {
    input: string;
    dryRun?: boolean;
    defaultLang?: string;
}

export interface CleanResult {
    lang: string;
    namespace: string;
    removed: string[];
}

export async function cleanOrphans(options: CleanOptions): Promise<CleanResult[]> {
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
        console.error(`❌ Need at least 2 language directories in ${inputDir}.`);
        process.exit(1);
    }

    const defaultLang = resolveDefaultLang(langDirs, options.defaultLang);
    const targetLangs = langDirs.filter((l) => l !== defaultLang);

    console.log(`🧹 Cleaning orphaned keys...`);
    console.log(`   Reference: ${defaultLang}`);
    console.log(`   Targets:   ${targetLangs.join(', ')}`);
    if (options.dryRun) console.log('   Mode:      DRY RUN (no files modified)');
    console.log('');

    const results: CleanResult[] = [];

    for (const targetLang of targetLangs) {
        const defaultDir = join(inputDir, defaultLang);
        const targetDir = join(inputDir, targetLang);

        const defaultFiles = readdirSync(defaultDir).filter((f) => f.endsWith('.json'));

        for (const file of readdirSync(targetDir).filter((f) => f.endsWith('.json'))) {
            const ns = file.replace('.json', '');
            const defaultFile = join(defaultDir, file);
            const targetFile = join(targetDir, file);

            if (!defaultFiles.includes(file)) {
                // Entire namespace is orphaned
                console.log(`📦 ${targetLang}/${ns}.json — entire namespace is orphaned`);
                continue;
            }

            const defaultData = JSON.parse(readFileSync(defaultFile, 'utf-8')) as Record<string, unknown>;
            const targetData = JSON.parse(readFileSync(targetFile, 'utf-8')) as Record<string, unknown>;

            const defaultKeys = new Set(collectFlatKeys(defaultData));
            const targetKeys = collectFlatKeys(targetData);

            const orphans = targetKeys.filter((key) => !defaultKeys.has(key));

            if (orphans.length > 0) {
                const result: CleanResult = { lang: targetLang, namespace: ns, removed: orphans };
                results.push(result);

                console.log(`📦 ${targetLang}/${ns}.json — ${orphans.length} orphaned key(s)`);
                for (const key of orphans) {
                    console.log(`   🗑️  ${key}`);
                }

                if (!options.dryRun) {
                    for (const key of orphans) {
                        removeNestedValue(targetData, key);
                    }
                    writeJsonFile(targetFile, targetData);
                    console.log(`   ✅ Cleaned.`);
                }
                console.log('');
            }
        }
    }

    const totalRemoved = results.reduce((sum, r) => sum + r.removed.length, 0);
    if (totalRemoved === 0) {
        console.log('✅ No orphaned keys found.');
    } else if (options.dryRun) {
        console.log(`⚠️  ${totalRemoved} orphaned key(s) would be removed. Run without --dry-run to apply.`);
    } else {
        console.log(`✅ Removed ${totalRemoved} orphaned key(s).`);
    }

    return results;
}
