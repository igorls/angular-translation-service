/**
 * ats check — Find missing and unused translation keys
 *
 * Scans source code (.ts + .html) for translation key usage and
 * cross-references with JSON files to detect:
 * - Missing keys: referenced in code but not in JSON
 * - Unused keys: defined in JSON but never referenced in code
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join, relative, resolve } from 'path';
import { loadNamespaces, collectFlatKeys, findFiles, getNestedValue } from './utils';

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
    referenceFailures: SourceReferenceFailure[];
    parityFailures: ParityFailure[];
    emptyValues: LocaleKeyIssue[];
    checkedReferences: number;
}

interface SourceReference {
    key: string;
    file: string;
    line: number;
    isPrefix: boolean;
}

export interface SourceReferenceFailure extends SourceReference {
    lang: string;
}

export interface LocaleKeyIssue {
    lang: string;
    namespace: string;
    key: string;
}

export interface ParityFailure extends LocaleKeyIssue {
    type: 'missing' | 'extra';
}

interface LocalePack {
    lang: string;
    dir: string;
    namespaces: Map<string, Record<string, unknown>>;
    keysByNamespace: Map<string, Set<string>>;
    keys: Set<string>;
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
    const keys = new Set<string>();
    const scopes: string[] = [];

    // translate('ns:key') and instant('ns:key')
    const methodRegex = /(?:translate|instant)\s*\(\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(content)) !== null) {
        keys.add(match[1]);
    }

    // 'ns:key' | translate (pipe syntax)
    const pipeRegex = /['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_.-]+)['"]\s*\|\s*translate/g;
    while ((match = pipeRegex.exec(content)) !== null) {
        keys.add(match[1]);
    }

    // Any quoted ns:key.path reference. This catches helper arrays, object configs,
    // and dynamic-prefix conventions such as 'admin:orders.status.'.
    const quotedReferenceRegex = /['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_.-]+)['"]/g;
    while ((match = quotedReferenceRegex.exec(content)) !== null) {
        keys.add(match[1]);
    }

    // select('ns') → entire namespace used
    const selectRegex = /select\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = selectRegex.exec(content)) !== null) {
        scopes.push(match[1]);
    }

    return { keys: [...keys], scopes };
}

function extractReferencesFromSource(content: string, file: string): SourceReference[] {
    const references: SourceReference[] = [];
    const seen = new Set<string>();
    const quotedReferenceRegex = /['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_.-]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = quotedReferenceRegex.exec(content)) !== null) {
        const key = match[1];
        const dedupeKey = `${key}:${match.index}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        references.push({
            key,
            file,
            line: content.slice(0, match.index).split(/\r?\n/).length,
            isPrefix: key.endsWith('.'),
        });
    }

    return references;
}

function directoryHasJsonFiles(dir: string): boolean {
    try {
        return readdirSync(dir).some((entry) => entry.endsWith('.json'));
    } catch {
        return false;
    }
}

function childLocaleDirs(dir: string): Array<{ lang: string; dir: string }> {
    try {
        return readdirSync(dir)
            .map((entry) => ({ lang: entry, dir: join(dir, entry) }))
            .filter((entry) => statSync(entry.dir).isDirectory() && directoryHasJsonFiles(entry.dir))
            .sort((a, b) => a.lang.localeCompare(b.lang));
    } catch {
        return [];
    }
}

function discoverLocaleDirs(i18nDir: string): Array<{ lang: string; dir: string }> {
    if (directoryHasJsonFiles(i18nDir)) {
        const siblings = childLocaleDirs(dirname(i18nDir));
        if (siblings.length > 1 && siblings.some((entry) => resolve(entry.dir) === resolve(i18nDir))) {
            return siblings;
        }
        return [{ lang: basename(i18nDir), dir: i18nDir }];
    }

    return childLocaleDirs(i18nDir);
}

function createLocalePack(lang: string, dir: string): LocalePack {
    const namespaces = loadNamespaces(dir);
    const keysByNamespace = new Map<string, Set<string>>();
    const keys = new Set<string>();

    for (const [ns, data] of namespaces) {
        const namespaceKeys = new Set(collectFlatKeys(data));
        keysByNamespace.set(ns, namespaceKeys);

        for (const key of namespaceKeys) {
            keys.add(`${ns}:${key}`);
        }
    }

    return { lang, dir, namespaces, keysByNamespace, keys };
}

function hasKey(pack: LocalePack, fullKey: string): boolean {
    return pack.keys.has(fullKey);
}

function hasPrefix(pack: LocalePack, fullPrefix: string): boolean {
    for (const key of pack.keys) {
        if (key.startsWith(fullPrefix)) return true;
    }
    return false;
}

function formatReference(reference: SourceReference): string {
    const rel = relative(process.cwd(), reference.file).replace(/\\/g, '/');
    return `${rel}:${reference.line}`;
}

function collectParityFailures(localePacks: LocalePack[], namespaceFilter?: string): ParityFailure[] {
    if (localePacks.length < 2) return [];

    const [referencePack, ...targetPacks] = localePacks;
    const namespaceNames = new Set<string>();
    for (const pack of localePacks) {
        for (const ns of pack.namespaces.keys()) {
            if (!namespaceFilter || ns === namespaceFilter) namespaceNames.add(ns);
        }
    }

    const failures: ParityFailure[] = [];
    for (const ns of [...namespaceNames].sort()) {
        const referenceKeys = referencePack.keysByNamespace.get(ns) ?? new Set<string>();

        for (const targetPack of targetPacks) {
            const targetKeys = targetPack.keysByNamespace.get(ns) ?? new Set<string>();

            for (const key of referenceKeys) {
                if (!targetKeys.has(key)) {
                    failures.push({ lang: targetPack.lang, namespace: ns, key, type: 'missing' });
                }
            }

            for (const key of targetKeys) {
                if (!referenceKeys.has(key)) {
                    failures.push({ lang: targetPack.lang, namespace: ns, key, type: 'extra' });
                }
            }
        }
    }

    return failures.sort((a, b) => `${a.namespace}:${a.key}:${a.lang}:${a.type}`.localeCompare(`${b.namespace}:${b.key}:${b.lang}:${b.type}`));
}

function collectEmptyValues(localePacks: LocalePack[], namespaceFilter?: string): LocaleKeyIssue[] {
    const emptyValues: LocaleKeyIssue[] = [];

    for (const pack of localePacks) {
        for (const [namespace, data] of pack.namespaces) {
            if (namespaceFilter && namespace !== namespaceFilter) continue;

            for (const key of collectFlatKeys(data)) {
                if (getNestedValue(data, key) === '') {
                    emptyValues.push({ lang: pack.lang, namespace, key });
                }
            }
        }
    }

    return emptyValues.sort((a, b) => `${a.lang}:${a.namespace}:${a.key}`.localeCompare(`${b.lang}:${b.namespace}:${b.key}`));
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

    // 1. Collect all defined translation keys. A path can be either a single
    // language directory or a parent directory with one subdirectory per locale.
    const localeDirs = discoverLocaleDirs(i18nDir);
    if (localeDirs.length === 0) {
        console.error(`❌ No translation JSON files found in: ${i18nDir}`);
        process.exit(1);
    }

    const localePacks = localeDirs.map((entry) => createLocalePack(entry.lang, entry.dir));
    const referencePack = localePacks[0];
    const namespaces = referencePack.namespaces;
    const definedKeys = new Set<string>();

    for (const [ns, data] of referencePack.namespaces) {
        if (options.namespace && ns !== options.namespace) continue;
        for (const key of collectFlatKeys(data)) {
            definedKeys.add(`${ns}:${key}`);
        }
    }

    // 2. Scan source files for key usage
    const sourceFiles = findFiles(srcDir, ['.ts', '.html']);
    const usedKeys = new Set<string>();
    const usedScopes = new Set<string>();
    const references: SourceReference[] = [];
    const firstReferenceByKey = new Map<string, SourceReference>();

    for (const file of sourceFiles) {
        // Skip spec files and node_modules
        if (file.includes('.spec.') || file.includes('node_modules')) continue;

        const content = readFileSync(file, 'utf-8');
        if (content.includes('Auto-generated by angular-translation-service CLI')) continue;

        const { keys, scopes } = extractKeysFromSource(content);
        const sourceReferences = extractReferencesFromSource(content, file);
        references.push(...sourceReferences);

        for (const key of keys) {
            if (key.endsWith('.')) continue;
            usedKeys.add(key);
            if (!firstReferenceByKey.has(key)) {
                const reference = sourceReferences.find((item) => item.key === key);
                if (reference) firstReferenceByKey.set(key, reference);
            }
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

    // 4. Compare source references against every locale pack
    const missing: string[] = [];
    const unused: string[] = [];
    const referenceFailures: SourceReferenceFailure[] = [];

    for (const reference of references) {
        for (const pack of localePacks) {
            const valid = reference.isPrefix
                ? hasPrefix(pack, reference.key)
                : hasKey(pack, reference.key);

            if (!valid) {
                referenceFailures.push({ ...reference, lang: pack.lang });
            }
        }

        if (reference.isPrefix) {
            for (const key of definedKeys) {
                if (key.startsWith(reference.key)) usedKeys.add(key);
            }
        }
    }

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

    const parityFailures = collectParityFailures(localePacks, options.namespace);
    const emptyValues = collectEmptyValues(localePacks, options.namespace);

    // Sort for consistent output
    missing.sort();
    unused.sort();

    // 5. Report
    if (localePacks.length > 1) {
        console.log(`   Locales:  ${localePacks.map((pack) => pack.lang).join(', ')}`);
        console.log('');
    }

    if (parityFailures.length === 0 && localePacks.length > 1) {
        for (const [ns, keys] of referencePack.keysByNamespace) {
            if (options.namespace && ns !== options.namespace) continue;
            console.log(`✅ parity ok: ${ns} (${keys.size} keys)`);
        }
        console.log('');
    }

    if (referenceFailures.length > 0) {
        console.log(`❌ Source reference failures: ${referenceFailures.length}`);
        for (const failure of referenceFailures.slice(0, 20)) {
            const kind = failure.isPrefix ? 'PREFIX' : 'MISSING';
            console.log(`   ${kind} [${failure.lang}] ${failure.key} ← ${formatReference(failure)}`);
        }
        if (referenceFailures.length > 20) {
            console.log(`   ... and ${referenceFailures.length - 20} more`);
        }
        console.log('');
    }

    if (parityFailures.length > 0) {
        console.log(`❌ Cross-locale parity failures: ${parityFailures.length}`);
        for (const failure of parityFailures.slice(0, 20)) {
            const label = failure.type === 'missing' ? 'Missing' : 'Extra';
            console.log(`   ${label} [${failure.lang}] ${failure.namespace}:${failure.key}`);
        }
        if (parityFailures.length > 20) {
            console.log(`   ... and ${parityFailures.length - 20} more`);
        }
        console.log('');
    }

    if (emptyValues.length > 0) {
        console.log(`❌ Empty values: ${emptyValues.length}`);
        for (const issue of emptyValues.slice(0, 20)) {
            console.log(`   Empty [${issue.lang}] ${issue.namespace}:${issue.key}`);
        }
        if (emptyValues.length > 20) {
            console.log(`   ... and ${emptyValues.length - 20} more`);
        }
        console.log('');
    }

    if (missing.length > 0) {
        console.log(`❌ Missing keys (used in code, not in JSON): ${missing.length}`);
        for (const key of missing) {
            const reference = firstReferenceByKey.get(key);
            console.log(`   - ${key}${reference ? ` ← ${formatReference(reference)}` : ''}`);
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

    if (
        missing.length === 0
        && unused.length === 0
        && referenceFailures.length === 0
        && parityFailures.length === 0
        && emptyValues.length === 0
    ) {
        console.log(`✅ All ${definedKeys.size} keys are valid — no missing or unused translations.`);
    }

    console.log(`references checked: ${references.length}; missing: ${referenceFailures.length}; total failures: ${referenceFailures.length + parityFailures.length + emptyValues.length}`);

    return {
        missing,
        unused,
        usedKeys,
        definedKeys,
        referenceFailures,
        parityFailures,
        emptyValues,
        checkedReferences: references.length,
    };
}
