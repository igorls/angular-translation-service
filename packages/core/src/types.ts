import { InjectionToken } from '@angular/core';

/**
 * Configuration for provideTranslation().
 */
export interface TranslationConfig {
    /** Default language code (e.g., 'en') */
    defaultLang: string;

    /** All supported language codes */
    supportedLangs: string[];

    /** Fallback chain for regional locales (e.g., { 'es-AR': ['es', 'en'] }) */
    fallbackChain?: Record<string, string[]>;

    /** Namespaces preloaded before app renders (via APP_INITIALIZER) */
    coreNamespaces: string[];

    /** Namespace separator character (default: ':') */
    namespaceSeparator?: string;

    /** Translation loader function */
    loader: TranslationLoader;

    /** localStorage key for persisting language preference */
    storageKey?: string;

    /** Whether to auto-detect language from browser/cookie */
    detectLanguage?: boolean;
}

/**
 * Loader function signature.
 * Given a language and namespace, returns the translation dictionary.
 */
export type TranslationLoader = (
    lang: string,
    namespace: string,
) => Promise<Record<string, unknown>>;

/**
 * InjectionToken for the translation config.
 */
export const TRANSLATION_CONFIG = new InjectionToken<TranslationConfig>(
    'TRANSLATION_CONFIG',
);

/**
 * InjectionToken for SSR language detection (provided by server).
 */
export const CURRENT_LANGUAGE = new InjectionToken<string>(
    'CURRENT_LANGUAGE',
);
