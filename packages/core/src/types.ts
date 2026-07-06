import { InjectionToken } from '@angular/core';

/**
 * Context provided to the missingKeyHandler callback.
 */
export interface MissingKeyContext {
    /** Current language code */
    lang: string;
    /** Namespace the key was looked up in */
    namespace: string;
}

/**
 * Declaration-merge hook for generated i18n types.
 *
 * `ats generate` augments this interface with:
 * - `keys`: a union of all known `namespace:path.to.key` strings
 * - `namespaces`: the generated namespace schema map
 *
 * Without augmentation, the public API falls back to permissive string keys.
 */
export interface TranslationKeyRegistry {}

/** Translation key type. Strict when generated types are registered; `string` otherwise. */
export type TranslationKey = TranslationKeyRegistry extends { keys: infer Keys }
    ? Extract<Keys, string>
    : string;

/** Namespace schema map. Strict when generated types are registered; generic otherwise. */
export type TranslationNamespaces = TranslationKeyRegistry extends { namespaces: infer Namespaces }
    ? Namespaces
    : Record<string, Record<string, unknown>>;

/** Namespace name type. Strict when generated types are registered; `string` otherwise. */
export type TranslationNamespace = Extract<keyof TranslationNamespaces, string>;

/** Placeholder params for a key. Reserved for generated param maps; permissive by default. */
export type TranslationParams<K extends string = string> =
    TranslationKeyRegistry extends { params: infer Params }
        ? K extends keyof Params
            ? Params[K] extends Record<string, string | number>
                ? Params[K]
                : Record<string, string | number>
            : Record<string, string | number>
        : Record<string, string | number>;

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

    /**
     * Called when a key is missing from a **loaded** namespace.
     * Return a string to display in place of the missing key.
     * Default: returns the raw key (e.g., 'common:nav.missing').
     *
     * Not called during loading — while a namespace is in flight,
     * the library returns '' to prevent FOUC.
     */
    missingKeyHandler?: (key: string, context: MissingKeyContext) => string;
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
