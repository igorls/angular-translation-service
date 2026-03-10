import { describe, it, expect, beforeEach } from 'bun:test';
import { createRecursiveProxy, clearProxyCache } from './recursive-proxy';

describe('createRecursiveProxy', () => {
    beforeEach(() => {
        clearProxyCache();
    });

    // ── Basic Property Access ─────────────────────────────────────────

    it('should return a proxy for any property access', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.nav).toBeDefined();
        expect(proxy.nav.title).toBeDefined();
        expect(proxy.deeply.nested.path.value).toBeDefined();
    });

    it('should never throw on deep access', () => {
        const proxy = createRecursiveProxy();
        expect(() => proxy.a.b.c.d.e.f.g.h).not.toThrow();
    });

    // ── Memoization (referential stability) ───────────────────────────

    it('should return the same proxy instance for the same path (memoization)', () => {
        const proxy = createRecursiveProxy();
        const first = proxy.nav.title;
        const second = proxy.nav.title;
        expect(first).toBe(second); // Referential equality — prevents NG0100
    });

    it('should return different proxies for different paths', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.nav.title).not.toBe(proxy.nav.subtitle);
    });

    it('should memoize across separate root proxy calls', () => {
        const a = createRecursiveProxy('test');
        const b = createRecursiveProxy('test');
        expect(a).toBe(b); // Same path = same instance
    });

    // ── String Coercion (template interpolation) ──────────────────────

    it('should return empty string for Symbol.toPrimitive on root', () => {
        const proxy = createRecursiveProxy();
        const result = `${proxy}`;
        expect(result).toBe('');
    });

    it('should return empty string for Symbol.toPrimitive on nested (FOUC prevention)', () => {
        const proxy = createRecursiveProxy('nav.title');
        const result = `${proxy}`;
        expect(result).toBe('');
    });

    it('should return empty string from toString on root proxy', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.toString()).toBe('');
    });

    it('should return empty string from toString on named proxy (FOUC prevention)', () => {
        const proxy = createRecursiveProxy('common');
        expect(proxy.toString()).toBe('');
    });

    // ── JSON Serialization Safety ─────────────────────────────────────

    it('should not crash JSON.stringify', () => {
        const proxy = createRecursiveProxy();
        expect(() => JSON.stringify(proxy)).not.toThrow();
    });

    it('should return {} from toJSON', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.toJSON()).toEqual({});
    });

    // ── Promise Detection Prevention ──────────────────────────────────

    it('should return undefined for "then" (prevents Promise detection)', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.then).toBeUndefined();
    });

    it('should return undefined for "catch"', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.catch).toBeUndefined();
    });

    it('should return undefined for "finally"', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.finally).toBeUndefined();
    });

    // ── Symbol.iterator (@for loop safety) ────────────────────────────

    it('should yield nothing from Symbol.iterator', () => {
        const proxy = createRecursiveProxy();
        const items = [...proxy];
        expect(items).toEqual([]);
    });

    it('should be safe in for...of loops', () => {
        const proxy = createRecursiveProxy();
        const items: unknown[] = [];
        for (const item of proxy) {
            items.push(item);
        }
        expect(items).toEqual([]);
    });

    // ── Angular Internal Properties ───────────────────────────────────

    it('should return undefined for __ngContext__', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.__ngContext__).toBeUndefined();
    });

    it('should return undefined for Angular lifecycle hooks', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.ngOnInit).toBeUndefined();
        expect(proxy.ngOnDestroy).toBeUndefined();
        expect(proxy.ngOnChanges).toBeUndefined();
        expect(proxy.ngDoCheck).toBeUndefined();
        expect(proxy.ngAfterContentInit).toBeUndefined();
        expect(proxy.ngAfterContentChecked).toBeUndefined();
        expect(proxy.ngAfterViewInit).toBeUndefined();
        expect(proxy.ngAfterViewChecked).toBeUndefined();
    });

    // ── String Method Collision Safety (Deep Think v3 #2) ──────────────

    it('should NOT delegate to String.prototype (prevents key corruption)', () => {
        const proxy = createRecursiveProxy('actions');
        // 'search' and 'replace' are common translation keys AND String.prototype methods
        // The proxy must return a child proxy, NOT String.prototype.search
        const search = proxy.search;
        expect(typeof search).not.toBe('function');
        expect(`${search}`).toBe(''); // FOUC-safe: empty string, not path

        const replace = proxy.replace;
        expect(typeof replace).not.toBe('function');
        expect(`${replace}`).toBe(''); // FOUC-safe: empty string, not path
    });

    // ── Depth Cap (Deep Think v2) ─────────────────────────────────────

    it('should return a frozen empty object beyond MAX_PROXY_DEPTH (15)', () => {
        const proxy = createRecursiveProxy();
        // Build a path with exactly 15 segments (hits the depth cap)
        let current: any = proxy;
        for (let i = 0; i < 15; i++) {
            current = current[`level${i}`];
        }
        // At depth 15, createRecursiveProxy returns a frozen empty object
        expect(Object.isFrozen(current)).toBe(true);
        expect(Object.keys(current)).toEqual([]);
        // Accessing beyond the frozen object returns undefined (normal JS)
        expect(current.anything).toBeUndefined();
    });

    it('should still work at exactly MAX_PROXY_DEPTH - 1', () => {
        const proxy = createRecursiveProxy();
        let current: any = proxy;
        for (let i = 0; i < 14; i++) {
            current = current[`l${i}`];
        }
        // At depth 14 (below cap), should still be a functional proxy
        expect(`${current}`).not.toBe('[object Object]');
    });

    // ── Symbol Properties (DevTools safety) ───────────────────────────

    it('should return undefined for arbitrary symbols', () => {
        const proxy = createRecursiveProxy();
        const sym = Symbol('test');
        expect(proxy[sym]).toBeUndefined();
    });

    it('should return "TranslationProxy" for Symbol.toStringTag', () => {
        const proxy = createRecursiveProxy();
        expect(proxy[Symbol.toStringTag]).toBe('TranslationProxy');
    });

    // ── Truthiness ────────────────────────────────────────────────────

    it('should be truthy (proxies are always truthy in JS)', () => {
        const proxy = createRecursiveProxy();
        expect(!!proxy).toBe(true);
        // This is the Truthiness Trap — proxies can't be falsy.
        // The library solves this at the Signal level (Signal<T | undefined>).
    });

    // ── has trap ──────────────────────────────────────────────────────

    it('should return true for "in" operator checks', () => {
        const proxy = createRecursiveProxy();
        expect('anything' in proxy).toBe(true);
    });

    // ── Cache clearing ────────────────────────────────────────────────

    it('should clear cache and return new instances after clearProxyCache', () => {
        const a = createRecursiveProxy('test');
        clearProxyCache();
        const b = createRecursiveProxy('test');
        expect(a).not.toBe(b); // Different instances after cache clear
    });
});
