import { TranslationLoader } from './types';

/**
 * Creates a fetch-based translation loader.
 *
 * Loads JSON files from: `${basePath}/${lang}/${namespace}.json`
 *
 * @example
 * provideTranslation({
 *   loader: httpLoader('/assets/i18n'),
 * })
 */
export function httpLoader(basePath: string): TranslationLoader {
    return async (lang: string, namespace: string) => {
        const url = `${basePath}/${lang}/${namespace}.json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `[angular-translation-service] Failed to load ${url}: ${response.status} ${response.statusText}`,
            );
        }

        return response.json();
    };
}

/**
 * Creates an import-based translation loader using dynamic imports.
 *
 * The factory callback must be provided by the consuming app so the bundler
 * can statically analyze the import paths at build time.
 *
 * @example
 * provideTranslation({
 *   loader: importLoader((lang, ns) => import(`./assets/i18n/${lang}/${ns}.json`)),
 * })
 */
export function importLoader(
    factory: (lang: string, namespace: string) => Promise<{ default: Record<string, unknown> }>,
): TranslationLoader {
    return async (lang: string, namespace: string) => {
        const module = await factory(lang, namespace);
        return module.default ?? module;
    };
}

export type { TranslationLoader };
