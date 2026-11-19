import {
    ApplicationRef,
    Injectable,
    Signal,
    computed,
    isDevMode,
    signal,
    inject,
    type WritableSignal,
} from '@angular/core';
import {
    TRANSLATION_CONFIG,
    CURRENT_LANGUAGE,
    type TranslationConfig,
    type TranslationKey,
    type TranslationNamespace,
    type TranslationNamespaces,
    type TranslationParams,
} from './types';
import { createRecursiveProxy } from './recursive-proxy';
import { matchBrowserLanguages, readStorage, writeStorage } from './language-detection';

/** Type alias for the nested dictionary structure */
type DictionaryMap = Map<string, Map<string, Record<string, unknown>>>;

/**
 * Walk a nested dictionary using dotted path segments, preferring the
 * **longest literal key match** at each level.
 *
 * That lets packs store event/id keys with dots inside a single object
 * property (`{ "lead.captured": "…" }`) while call sites still write
 * `ns:group.lead.captured`. Nested objects continue to work: when both a
 * longer literal and a nested segment exist, the longer own-property wins.
 */
export function resolveDottedPath(
    root: Record<string, unknown>,
    path: string,
): unknown {
    if (!path) return root;
    const segments = path.split('.');
    let current: unknown = root;
    let i = 0;
    while (i < segments.length) {
        if (current == null || typeof current !== 'object') return undefined;
        const record = current as Record<string, unknown>;
        let matched = false;
        // Longest match first so "lead.captured" wins over "lead" + "captured".
        for (let end = segments.length; end > i; end--) {
            const candidate = segments.slice(i, end).join('.');
            if (Object.prototype.hasOwnProperty.call(record, candidate)) {
                current = record[candidate];
                i = end;
                matched = true;
                break;
            }
        }
        if (!matched) return undefined;
    }
    return current;
}

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

    /**
     * Increments on every setLang() call. A switch that is still loading
     * bails out when a newer call has superseded it.
     */
    private langSwitchSeq = 0;

    /** All namespaces ever requested (not just loaded) — fixes setLang() race condition (DT v3 #4) */
    private readonly requestedNamespaces = new Set<string>();

    /** Namespaces that already emitted the instant-before-request dev warning */
    private readonly instantUnrequestedNamespaceWarnings = new Set<string>();

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
        (instance as any).langSwitchSeq = 0;
        (instance as any).requestedNamespaces = new Set<string>();
        (instance as any).instantUnrequestedNamespaceWarnings = new Set<string>();
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
    select<N extends TranslationNamespace>(scope: N): Signal<TranslationNamespaces[N] | undefined> {
        if (this.scopeCache.has(scope)) {
            return this.scopeCache.get(scope)! as Signal<TranslationNamespaces[N] | undefined>;
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
        return scopeSignal as Signal<TranslationNamespaces[N] | undefined>;
    }

    /**
     * Returns a signal for a single translation key.
     * Base key signal is cached; parameterized calls return uncached computed.
     *
     * Key format: 'namespace:dotted.path' (e.g., 'common:nav.title')
     */
    translate<K extends TranslationKey>(
        key: K,
        params?: TranslationParams<K>,
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
    instant<K extends TranslationKey>(key: K, params?: TranslationParams<K>): string {
        this.requestNamespaceForInstantIfNeeded(key);
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

        const seq = ++this.langSwitchSeq;

        // Namespaces requested while this switch is awaiting a load are picked
        // up on the next pass, before the visible language flips. Each namespace
        // is attempted once: a reject or a non-dictionary payload is not stored,
        // so waiting until the dictionary appears would refetch forever.
        const attempted = new Set<string>();
        for (;;) {
            if (seq !== this.langSwitchSeq) return;
            const pending = this.getLoadedNamespaces().filter(
                (ns) => !attempted.has(ns) && !this.dictionaries().get(lang)?.has(ns),
            );
            if (pending.length === 0) break;
            for (const ns of pending) attempted.add(ns);
            await this.loadNamespaces(lang, pending);
        }

        if (seq !== this.langSwitchSeq) return;

        // Persist preference. Storage failures (private mode, quota) must not
        // leave the in-memory language on the previous value.
        if (this.config.storageKey) {
            writeStorage(this.config.storageKey, lang);
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
        if (this.config.storageKey) {
            const stored = readStorage(this.config.storageKey);
            if (stored && this.config.supportedLangs.includes(stored)) {
                return stored;
            }
        }

        // 3. Browser detection. Prefer an exact base tag (`en`) over a
        // different regional sibling (`en-GB`) when the browser asks for `en-US`.
        if (this.config.detectLanguage && typeof navigator !== 'undefined' && navigator.language) {
            const languages = navigator.languages ?? [navigator.language];
            const match = matchBrowserLanguages(this.config.supportedLangs, languages);
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

            // Ignore fulfilled payloads that are not plain objects (null, arrays,
            // strings). Merging those used to throw and discard successful fallbacks.
            const usable = results.some(
                (r) => r.status === 'fulfilled' && isPlainRecord(r.value),
            );
            if (!usable) {
                // All fetches failed or returned non-dictionaries — do NOT store
                // empty data, so a later call can retry.
                return;
            }

            // Deep merge: fallback first, then more specific locale overwrites
            let merged: Record<string, unknown> = {};
            for (let i = results.length - 1; i >= 0; i--) {
                const result = results[i];
                if (result.status === 'fulfilled' && isPlainRecord(result.value)) {
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

    private requestNamespaceForInstantIfNeeded(key: string): void {
        const namespace = this.getNamespaceFromKey(key);
        if (!namespace) return;

        const wasRequested = this.requestedNamespaces.has(namespace);
        if (wasRequested || this.isNamespaceLoadedForCurrentLang(namespace)) return;

        if (isDevMode() && !this.instantUnrequestedNamespaceWarnings.has(namespace)) {
            this.instantUnrequestedNamespaceWarnings.add(namespace);
            console.warn(
                `[angular-translation-service] instant("${key}") called before namespace "${namespace}" was requested. ` +
                `Call ensureNamespaces(["${namespace}"]) or use translate() for reactive lazy loading.`,
            );
        }

        void this.ensureNamespaces([namespace]);
    }

    private getNamespaceFromKey(key: string): string | undefined {
        const sepIndex = key.indexOf(this.sep);
        if (sepIndex === -1) return undefined;
        const namespace = key.substring(0, sepIndex);
        return namespace || undefined;
    }

    private isNamespaceLoadedForCurrentLang(namespace: string): boolean {
        const langDict = this.dictionaries().get(this.lang());
        return langDict?.has(namespace) ?? false;
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
        if (nsData == null || typeof nsData !== 'object') {
            return this.handleMissingKey(key, currentLang, namespace);
        }

        // Resolve dotted path with longest-match at each level so JSON keys that
        // contain literal dots (e.g. eventLabels["lead.captured"]) resolve when
        // the call site uses `ns:eventLabels.lead.captured`. Nested objects still
        // win when present as intermediate segments.
        const resolved = resolveDottedPath(nsData as Record<string, unknown>, path);
        if (typeof resolved === 'string') return resolved;
        // Numeric leaves are valid catalog values (counts, versions). Stringify
        // them instead of reporting the key as missing.
        if (typeof resolved === 'number' && Number.isFinite(resolved)) return String(resolved);

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
        // Match {name} and {{name}} only. The previous optional-brace pattern
        // also rewrote tokens inside ICU-looking text such as `{# item}`.
        // Numeric values including 0 are interpolated; nullish values keep a
        // single-brace placeholder.
        return text.replace(
            /\{\{\s*([\w-]+)\s*\}\}|\{(\s*[\w-]+\s*)\}/g,
            (full, doubleKey: string | undefined, singleKey: string | undefined) => {
                const raw = doubleKey ?? singleKey;
                if (raw === undefined) return full;
                const key = raw.trim();
                if (!Object.prototype.hasOwnProperty.call(params, key)) return `{${key}}`;
                const value = params[key];
                if (value === undefined || value === null) return `{${key}}`;
                return String(value);
            },
        );
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

                const childPath = path ? `${path}.${prop}` : prop;
                const hasOwn = Object.prototype.hasOwnProperty.call(target, prop);
                if (!hasOwn) {
                    // Don't surface Object.prototype members (constructor, toString, …).
                    if (prop === 'toString' || prop === 'valueOf') return () => '';
                    return createRecursiveProxy(childPath);
                }

                const value = target[prop];

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
        // Hydrated namespaces were loaded on the server. Track them so a later
        // setLang() reloads those lazy packs instead of dropping them.
        for (const langDict of dicts.values()) {
            for (const ns of langDict.keys()) {
                this.requestedNamespaces.add(ns);
            }
        }
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
