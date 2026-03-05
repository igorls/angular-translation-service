/**
 * Auto-discovery of i18n folder in an Angular project.
 *
 * Strategy:
 * 1. Check angular.json for asset configs pointing to i18n
 * 2. Check common conventions: src/i18n/, src/assets/i18n/, i18n/
 * 3. Look for directories containing subdirs with .json files
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const CONVENTIONS = [
    'src/i18n',
    'src/assets/i18n',
    'i18n',
    'public/i18n',
    'assets/i18n',
];

export interface DiscoveryResult {
    /** Absolute path to the i18n root directory */
    i18nDir: string;
    /** Language codes found (directory names) */
    languages: string[];
    /** How the directory was found */
    source: 'angular.json' | 'convention' | 'explicit';
}

/**
 * Discovers the i18n directory in the given project root.
 */
export function discoverI18nDir(projectRoot: string, explicitPath?: string): DiscoveryResult | null {
    const root = resolve(projectRoot);

    // 1. Explicit path takes priority
    if (explicitPath) {
        const absPath = resolve(root, explicitPath);
        const langs = detectLanguages(absPath);
        if (langs.length > 0) {
            return { i18nDir: absPath, languages: langs, source: 'explicit' };
        }
        return null;
    }

    // 2. Try angular.json
    const angularJsonPath = join(root, 'angular.json');
    if (existsSync(angularJsonPath)) {
        try {
            const angularJson = JSON.parse(readFileSync(angularJsonPath, 'utf-8'));
            const projects = angularJson.projects ?? {};

            for (const projectName of Object.keys(projects)) {
                const project = projects[projectName];
                const sourceRoot = project.sourceRoot ?? `projects/${projectName}/src`;

                // Check common i18n paths relative to sourceRoot
                for (const subPath of ['i18n', 'assets/i18n']) {
                    const candidate = join(root, sourceRoot, subPath);
                    const langs = detectLanguages(candidate);
                    if (langs.length > 0) {
                        return { i18nDir: candidate, languages: langs, source: 'angular.json' };
                    }
                }
            }
        } catch {
            // Ignore parse errors
        }
    }

    // 3. Convention-based detection
    for (const convention of CONVENTIONS) {
        const candidate = join(root, convention);
        const langs = detectLanguages(candidate);
        if (langs.length > 0) {
            return { i18nDir: candidate, languages: langs, source: 'convention' };
        }
    }

    return null;
}

/**
 * Detects language subdirectories within a directory.
 * A language directory is one that contains at least one .json file.
 */
export function detectLanguages(dir: string): string[] {
    if (!existsSync(dir)) return [];

    try {
        const entries = readdirSync(dir);
        const langs: string[] = [];

        for (const entry of entries) {
            const entryPath = join(dir, entry);
            try {
                const files = readdirSync(entryPath);
                if (files.some((f) => f.endsWith('.json'))) {
                    langs.push(entry);
                }
            } catch {
                // Not a directory, skip
            }
        }

        return langs.sort();
    } catch {
        return [];
    }
}
