import {
    ApplicationRef,
    Injectable,
    Signal,
    computed,
    signal,
    inject,
    type WritableSignal,
} from '@angular/core';
import { TRANSLATION_CONFIG, CURRENT_LANGUAGE, type TranslationConfig } from './types';
import { createRecursiveProxy } from './recursive-proxy';

/** Type alias for the nested dictionary structure */
type DictionaryMap = Map<string, Map<string, Record<string, unknown>>>;

/**
 * Core translation service providing reactive i18n for Angular applications.
 *
 * API surface:
 * - select(scope)   → Signal<T | undefined> — scope proxy for template access
 * - translate(key)  → Signal<string>         — single key signal (cached)
 * - instant(key)    → string                 — imperative, non-reactive
 * - setLang(lang)   → Promise<void>          — switch language at runtime
 * - ensureNamespaces(ns[]) → Promise<void>   — pre-load namespaces
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
    private readonly config: TranslationConfig;

    /** Separator between namespace and key path (default ':') */
    private readonly sep: string;

    /** Current language signal */
    readonly lang: WritableSignal<string>;

    /** All supported language codes from configuration */
    readonly supportedLangs: readonly string[];

    /**
     * Flat namespace dictionaries: lang -> namespace -> data.
     * Stored as a signal so computed() reads automatically track mutations.
     * (Audit #2 — replaces manual version counter anti-pattern)
     */
    private readonly dictionaries: WritableSignal<DictionaryMap>;

    /** Loading promises dedup: namespace -> Promise */
    private readonly loadingPromises = new Map<string, Promise<void>>();

    /** All namespaces ever requested (not just loaded) — fixes setLang() race condition (DT v3 #4) */
    private readonly requestedNamespaces = new Set<string>();

    /** Whether core namespaces have been loaded */
    readonly ready: Signal<boolean>;

    /** Signal cache for translate() — keyed by base key only */
    private readonly signalCache = new Map<string, Signal<string>>();

    /** Signal cache for select() — keyed by namespace */
    private readonly scopeCache = new Map<string, Signal<Record<string, unknown> | undefined>>();

    /** ApplicationRef for triggering CD in zoneless mode after async loads */
    private readonly appRef: ApplicationRef | null;

    /**
     * Angular DI constructor.
     * For testing, use TranslationService.create() instead.
     */
    constructor() {
        this.config = inject(TRANSLATION_CONFIG);
        const ssrLang = inject(CURRENT_LANGUAGE, { optional: true });
        this.appRef = inject(ApplicationRef, { optional: true });
        this.sep = this.config.namespaceSeparator ?? ':';
        this.supportedLangs = Object.freeze([...this.config.supportedLangs]);
        this.dictionaries = signal(new Map());
        this.lang = signal(this._resolveInitialLang(ssrLang ?? undefined));
        this.ready = computed(() => {
            const dicts = this.dictionaries();
            const currentLang = this.lang();
            const langDict = dicts.get(currentLang);
            if (!langDict) return false;
            return this.config.coreNamespaces.every((ns) => langDict.has(ns));
        });
    }

    /**
     * Creates a TranslationService instance without Angular DI.
     * Used for unit testing.
     */
    static create(config: TranslationConfig, ssrLang?: string): TranslationService {
        const instance = Object.create(TranslationService.prototype) as TranslationService;

        // Initialize private fields manually
        (instance as any).config = config;
        (instance as any).appRef = null; // No DI in static factory
        (instance as any).sep = config.namespaceSeparator ?? ':';
        (instance as any).supportedLangs = Object.freeze([...config.supportedLangs]);
        (instance as any).dictionaries = signal(new Map() as DictionaryMap);
        (instance as any).loadingPromises = new Map<string, Promise<void>>();
        (instance as any).requestedNamespaces = new Set<string>();
        (instance as any).signalCache = new Map<string, Signal<string>>();
        (instance as any).scopeCache = new Map<string, Signal<Record<string, unknown> | undefined>>();
        (instance as any).lang = signal(instance._resolveInitialLang(ssrLang));
        (instance as any).ready = computed(() => {
            const dicts = instance.dictionaries();
            const currentLang = instance.lang();
            const langDict = dicts.get(currentLang);
            if (!langDict) return false;
            return config.coreNamespaces.every((ns: string) => langDict.has(ns));
        });

        return instance;
    }

    /**
     * Returns a scope signal for template access.
     *
     * - Core namespaces (preloaded): never undefined
     * - Lazy namespaces: undefined until loaded, then proxy-wrapped data
     *
     * @example
     * protected common = this.i18n.select('common');
     * // template: @let t = common(); {{ t.nav.title }}
     */
    select<K extends string>(scope: K): Signal<Record<string, unknown> | undefined> {
        if (this.scopeCache.has(scope)) {
            return this.scopeCache.get(scope)!;
        }

        // Trigger loading if not yet loaded
        this.ensureNamespaces([scope]);

        const scopeSignal = computed(() => {
            const dicts = this.dictionaries(); // auto-tracked by signal
            const currentLang = this.lang();
            const langDict = dicts.get(currentLang);
            const data = langDict?.get(scope);

            if (!data) {
                // Not loaded yet — return undefined (falsy, solves Truthiness Trap)
                return undefined;
            }

            // Wrap in proxy for safe deep access
            return this.wrapWithProxy(data, scope);
        });

        this.scopeCache.set(scope, scopeSignal);
        return scopeSignal;
    }

    /**
     * Returns a signal for a single translation key.
     * Base key signal is cached; parameterized calls return uncached computed.
     *
     * Key format: 'namespace:dotted.path' (e.g., 'common:nav.title')
     */
    translate(
        key: string,
        params?: Record<string, string | number>,
    ): Signal<string> {
        // If parameterized, return uncached computed to prevent memory leaks
        if (params) {
            const baseSignal = this.getOrCreateBaseSignal(key);
            return computed(() => this.interpolate(baseSignal(), params));
        }

        return this.getOrCreateBaseSignal(key);
    }

    /**
     * Returns the translation string synchronously (non-reactive).
     * Use for imperative code like toasts, logging, etc.
     */
    instant(key: string, params?: Record<string, string | number>): string {
        const value = this.resolveKey(key);
        return params ? this.interpolate(value, params) : value;
    }

    /**
     * Switch language at runtime. Reloads all cached namespaces.
     */
    async setLang(lang: string): Promise<void> {
        if (!this.config.supportedLangs.includes(lang)) {
            console.warn(
                `[angular-translation-service] Language "${lang}" is not in supportedLangs`,
            );
            return;
        }

        // Load all currently cached namespaces for the new language
        const namespacesToLoad = this.getLoadedNamespaces();
        await this.loadNamespaces(lang, namespacesToLoad);

        // Persist preference
        if (this.config.storageKey && typeof localStorage !== 'undefined') {
            localStorage.setItem(this.config.storageKey, lang);
        }

        this.lang.set(lang);
    }

    /**
     * Pre-load additional namespaces. Auto-deduplicates concurrent loads.
     */
    async ensureNamespaces(namespaces: string[]): Promise<void> {
        // Track all requested namespaces (fixes setLang race condition — DT v3 #4)
        namespaces.forEach((ns) => this.requestedNamespaces.add(ns));

        const currentLang = this.lang();
        const dicts = this.dictionaries();
        const missing = namespaces.filter((ns) => {
            const langDict = dicts.get(currentLang);
            return !langDict?.has(ns);
        });

        if (missing.length === 0) return;

        await this.loadNamespaces(currentLang, missing);
    }

    // ── Private Methods ──────────────────────────────────────────────

    private _resolveInitialLang(ssrLang?: string): string {
        // 1. SSR token
        if (ssrLang) return ssrLang;

        // 2. Persisted preference
        if (this.config.storageKey && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored && this.config.supportedLangs.includes(stored)) {
                return stored;
            }
        }

        // 3. Browser detection
        if (this.config.detectLanguage && typeof navigator !== 'undefined' && navigator.language) {
            const browserLang = navigator.language;
            if (this.config.supportedLangs.includes(browserLang)) {
                return browserLang;
            }
            // Try base language (e.g., 'pt' from 'pt-BR')
            const baseLang = browserLang.split('-')[0];
            const match = this.config.supportedLangs.find(
                (l) => l === baseLang || l.startsWith(baseLang + '-'),
            );
            if (match) return match;
        }

        // 4. Default
        return this.config.defaultLang;
    }

    private async loadNamespaces(
        lang: string,
        namespaces: string[],
    ): Promise<void> {
        const promises = namespaces.map((ns) => this.loadSingleNamespace(lang, ns));
        await Promise.all(promises);
    }

    private async loadSingleNamespace(
        lang: string,
        namespace: string,
    ): Promise<void> {
        const dedupKey = `${lang}:${namespace}`;

        // Dedup concurrent loads
        if (this.loadingPromises.has(dedupKey)) {
            return this.loadingPromises.get(dedupKey)!;
        }

        const loadPromise = this.doLoad(lang, namespace, dedupKey);
        this.loadingPromises.set(dedupKey, loadPromise);
        return loadPromise;
    }

    private async doLoad(
        lang: string,
        namespace: string,
        dedupKey: string,
    ): Promise<void> {
        try {
            // Build fallback chain: [lang, ...fallbacks]
            const chain = [lang, ...(this.config.fallbackChain?.[lang] ?? [])];
            const uniqueChain = [...new Set(chain)];

            // Fetch all in parallel
            const results = await Promise.allSettled(
                uniqueChain.map((l) => this.config.loader(l, namespace)),
            );

            // Check if at least one fetch succeeded
            const hasData = results.some((r) => r.status === 'fulfilled');
            if (!hasData) {
                // All fetches failed — do NOT store empty data, let the namespace
                // remain "unloaded" so client-side can retry via HTTP
                return;
            }

            // Deep merge: fallback first, then more specific locale overwrites
            let merged: Record<string, unknown> = {};
            for (let i = results.length - 1; i >= 0; i--) {
                const result = results[i];
                if (result.status === 'fulfilled') {
                    merged = this.deepMerge(merged, result.value);
                }
            }

            // Immutable update — creates new Map references so signal subscribers are notified
            this.dictionaries.update((prev) => {
                const next = new Map(prev);
                const langDict = next.get(lang) ?? new Map();
                const nextLangDict = new Map(langDict);
                nextLangDict.set(namespace, merged);
                next.set(lang, nextLangDict);
                return next;
            });

            // In zoneless mode, fetch() isn't patched by Angular so signal
            // updates from async callbacks don't automatically trigger CD.
            // Explicitly notify Angular to re-render affected views.
            this.appRef?.tick();
        } catch (err) {
            console.error(
                `[angular-translation-service] Failed to load ${lang}/${namespace}:`,
                err,
            );
        } finally {
            this.loadingPromises.delete(dedupKey);
        }
    }

    private getOrCreateBaseSignal(key: string): Signal<string> {
        if (this.signalCache.has(key)) {
            return this.signalCache.get(key)!;
        }

        // Auto-trigger namespace loading
        const namespace = key.split(this.sep)[0];
        if (namespace) {
            this.ensureNamespaces([namespace]);
        }

        const sig = computed(() => this.resolveKey(key));
        this.signalCache.set(key, sig);
        return sig;
    }

    private resolveKey(key: string): string {
        const dicts = this.dictionaries(); // auto-tracked by signal
        const currentLang = this.lang();

        const sepIndex = key.indexOf(this.sep);
        if (sepIndex === -1) return key; // no namespace separator found

        const namespace = key.substring(0, sepIndex);
        const path = key.substring(sepIndex + 1);

        const langDict = dicts.get(currentLang);
        if (!langDict?.has(namespace)) {
            // Namespace not loaded yet — return empty string to prevent FOUC
            return '';
        }

        const nsData = langDict.get(namespace);

        // Resolve dotted path
        const segments = path.split('.');
        let current: unknown = nsData;
        for (const segment of segments) {
            if (current == null || typeof current !== 'object') {
                // Namespace loaded but key is missing
                return this.handleMissingKey(key, currentLang, namespace);
            }
            current = (current as Record<string, unknown>)[segment];
        }

        if (typeof current === 'string') return current;

        // Leaf is not a string — treat as missing key
        return this.handleMissingKey(key, currentLang, namespace);
    }

    /**
     * Handles a key that is missing from a loaded namespace.
     * Invokes `missingKeyHandler` if configured, otherwise returns the raw key.
     */
    private handleMissingKey(key: string, lang: string, namespace: string): string {
        if (this.config.missingKeyHandler) {
            return this.config.missingKeyHandler(key, { lang, namespace });
        }
        return key;
    }

    private interpolate(
        text: string,
        params: Record<string, string | number>,
    ): string {
        // [\w-]+ supports hyphenated params like {user-name} (DT v3 #8)
        return text.replace(/\{\{?\s*([\w-]+)\s*\}?\}/g, (_, key) => {
            return params[key]?.toString() ?? `{${key}}`;
        });
    }

    /**
     * Wraps loaded dictionary data in a proxy that:
     * - Returns real values for existing keys
     * - Returns createRecursiveProxy with full path for missing keys
     * - Guards Angular internals from getting proxy-wrapped (DT v3 #6)
     */
    private wrapWithProxy(
        data: Record<string, unknown>,
        path: string,
    ): Record<string, unknown> {
        const self = this;
        return new Proxy(data, {
            get(target, prop: string | symbol): unknown {
                if (typeof prop === 'symbol') {
                    if (prop === Symbol.toPrimitive) return () => '';
                    if (prop === Symbol.iterator) return function* () { };
                    if (prop === Symbol.toStringTag) return 'TranslationScope';
                    return undefined;
                }

                // Guard Angular internals — must return undefined (DT v3 #6)
                if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
                if (prop === '__ngContext__' || prop === '__ngSimpleChanges__') return undefined;
                if (prop.startsWith('ng') && prop[2] === prop[2]?.toUpperCase()) return undefined;

                const value = target[prop];
                const childPath = path ? `${path}.${prop}` : prop;

                if (value === undefined) {
                    // Key not in dictionary — return safe proxy with full path for debugging
                    return createRecursiveProxy(childPath);
                }

                if (typeof value === 'object' && value !== null) {
                    // Nested object — wrap recursively with path tracking
                    return self.wrapWithProxy(value as Record<string, unknown>, childPath);
                }

                // Leaf value (string, number, etc.)
                return value;
            },

            has(_target, _prop) {
                return true;
            },
        });
    }

    // ── SSR Hooks ──────────────────────────────────────────────────────

    /**
     * Returns the current dictionary state for server-side snapshot.
     * Used by TranslationTransferState to serialize loaded translations
     * into TransferState before HTML serialization.
     */
    getDictionaries(): DictionaryMap {
        return this.dictionaries();
    }

    /**
     * Replaces the entire dictionary state for client-side hydration.
     * Used by TranslationTransferState to restore translations from
     * TransferState, preventing redundant HTTP loads and hydration mismatch.
     */
    setDictionaries(dicts: DictionaryMap): void {
        this.dictionaries.set(dicts);
    }

    /**
     * Returns all namespaces ever requested (not just loaded).
     * This prevents the setLang() race condition where in-flight
     * namespaces would be skipped during language switch (DT v3 #4).
     */
    private getLoadedNamespaces(): string[] {
        return [...this.requestedNamespaces];
    }

    /**
     * Recursively deep-merges two translation dictionaries.
     * Source values overwrite target values at leaf level.
     * Nested objects are merged recursively (not replaced).
     */
    private deepMerge(
        target: Record<string, unknown>,
        source: Record<string, unknown>,
    ): Record<string, unknown> {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            const sourceVal = source[key];
            const targetVal = result[key];

            if (
                typeof sourceVal === 'object' && sourceVal !== null && !Array.isArray(sourceVal) &&
                typeof targetVal === 'object' && targetVal !== null && !Array.isArray(targetVal)
            ) {
                result[key] = this.deepMerge(
                    targetVal as Record<string, unknown>,
                    sourceVal as Record<string, unknown>,
                );
            } else {
                result[key] = sourceVal;
            }
        }

        return result;
    }
}
