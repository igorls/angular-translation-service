/**
 * Creates a recursive proxy that safely intercepts all property access.
 *
 * Used to prevent template crashes when translation namespaces are still loading.
 * The proxy returns nested proxies for any accessed property, ensuring expressions
 * like `t().nav.title` never throw, even when the underlying data is undefined.
 *
 * Design decisions (from Deep Think review):
 * - Memoizes nested paths for referential stability (prevents NG0100)
 * - Traps toJSON, then/catch, Symbol.iterator, Symbol.toPrimitive, Angular internals
 * - Returns '' for string coercion, {} for JSON serialization
 */

/** Cache of proxy instances by path to ensure referential equality */
const PROXY_CACHE = new Map<string, any>();

/**
 * Maximum proxy nesting depth. Beyond this, returns a frozen empty object.
 * Prevents infinite traversal from DevTools, logging libs, or deep-cloners.
 * (Deep Think v2 recommendation)
 */
const MAX_PROXY_DEPTH = 15;

/** Properties that Angular's internals probe — must return undefined */
const ANGULAR_INTERNALS = new Set([
    '__ngContext__',
    '__ngSimpleChanges__',
    'ngOnInit',
    'ngOnDestroy',
    'ngOnChanges',
    'ngDoCheck',
    'ngAfterContentInit',
    'ngAfterContentChecked',
    'ngAfterViewInit',
    'ngAfterViewChecked',
]);

export function createRecursiveProxy(path: string = ''): any {
    if (PROXY_CACHE.has(path)) {
        return PROXY_CACHE.get(path)!;
    }

    // Depth cap — prevents infinite traversal (Deep Think v2)
    const depth = path ? path.split('.').length : 0;
    if (depth >= MAX_PROXY_DEPTH) {
        const frozen = Object.freeze({});
        PROXY_CACHE.set(path, frozen);
        return frozen;
    }

    const proxy = new Proxy(Object.create(null), {
        get(_target: any, prop: string | symbol): any {
            // String coercion — return empty string to prevent FOUC
            if (prop === Symbol.toPrimitive || prop === 'valueOf') {
                return () => '';
            }

            if (prop === Symbol.toStringTag) {
                return 'TranslationProxy';
            }

            // toString — return empty string to prevent FOUC
            // Path is still available via Symbol.toStringTag for DevTools
            if (prop === 'toString') {
                return () => '';
            }

            // JSON serialization — prevent crash
            if (prop === 'toJSON') {
                return () => ({});
            }

            // Promise detection — prevent async unwrapping
            if (prop === 'then' || prop === 'catch' || prop === 'finally') {
                return undefined;
            }

            // Iterator — yield nothing (safe for @for loops)
            if (prop === Symbol.iterator) {
                return function* () { };
            }

            // Angular lifecycle internals — must return undefined
            if (typeof prop === 'string' && ANGULAR_INTERNALS.has(prop)) {
                return undefined;
            }

            // Skip symbol properties (DevTools iteration safety)
            if (typeof prop === 'symbol') {
                return undefined;
            }

            // Recursive: return another memoized proxy for the nested path
            const childPath = path ? `${path}.${prop}` : prop;
            return createRecursiveProxy(childPath);
        },

        has(_target: any, _prop: string | symbol): boolean {
            return true;
        },

        ownKeys(): string[] {
            return [];
        },

        getOwnPropertyDescriptor(): PropertyDescriptor | undefined {
            return {
                configurable: true,
                enumerable: false,
                value: undefined,
            };
        },
    });

    PROXY_CACHE.set(path, proxy);
    return proxy;
}

/**
 * Clears the proxy cache. Useful for testing.
 */
export function clearProxyCache(): void {
    PROXY_CACHE.clear();
}
