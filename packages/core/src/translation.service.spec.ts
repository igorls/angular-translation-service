import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TranslationService } from './translation.service';
import type { TranslationConfig } from './types';

/**
 * Creates a mock loader that returns pre-configured dictionaries.
 */
function createMockLoader(data: Record<string, Record<string, Record<string, unknown>>>) {
    return mock((lang: string, namespace: string) => {
        const langData = data[lang];
        if (!langData || !langData[namespace]) {
            return Promise.reject(new Error(`No data for ${lang}/${namespace}`));
        }
        return Promise.resolve(structuredClone(langData[namespace]));
    });
}

function createService(
    overrides: Partial<TranslationConfig> & { loader: TranslationConfig['loader'] },
    ssrLang?: string,
): TranslationService {
    const config: TranslationConfig = {
        defaultLang: 'en',
        supportedLangs: ['en', 'pt-BR', 'es'],
        coreNamespaces: ['common'],
        namespaceSeparator: ':',
        detectLanguage: false,
        ...overrides,
    };
    return TranslationService.create(config, ssrLang);
}

describe('TranslationService', () => {
    // ── Language Initialization ───────────────────────────────────────

    describe('language initialization', () => {
        it('should default to defaultLang', () => {
            const loader = createMockLoader({ en: { common: { title: 'Hi' } } });
            const service = createService({ loader });
            expect(service.lang()).toBe('en');
        });

        it('should use SSR language when provided', () => {
            const loader = createMockLoader({ 'pt-BR': { common: { title: 'Oi' } } });
            const service = createService({ loader }, 'pt-BR');
            expect(service.lang()).toBe('pt-BR');
        });
    });

    // ── ensureNamespaces ──────────────────────────────────────────────

    describe('ensureNamespaces', () => {
        it('should load a namespace via the loader', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);
            expect(loader).toHaveBeenCalledWith('en', 'common');
        });

        it('should deduplicate concurrent loads for the same namespace', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });

            const p1 = service.ensureNamespaces(['common']);
            const p2 = service.ensureNamespaces(['common']);
            await Promise.all([p1, p2]);

            expect(loader).toHaveBeenCalledTimes(1);
        });

        it('should not reload already-loaded namespaces', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });

            await service.ensureNamespaces(['common']);
            await service.ensureNamespaces(['common']);

            expect(loader).toHaveBeenCalledTimes(1);
        });
    });

    // ── translate() ───────────────────────────────────────────────────

    describe('translate()', () => {
        it('should return a signal resolving to the translated string', async () => {
            const loader = createMockLoader({ en: { common: { greeting: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:greeting');
            expect(sig()).toBe('Hello');
        });

        it('should return empty string when namespace is not loaded (FOUC prevention)', () => {
            const loader = createMockLoader({});
            const service = createService({ loader });

            const sig = service.translate('missing:key.path');
            expect(sig()).toBe('');
        });

        it('should resolve nested dotted paths', async () => {
            const loader = createMockLoader({
                en: { common: { nav: { home: 'Home', about: 'About' } } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.translate('common:nav.home')()).toBe('Home');
            expect(service.translate('common:nav.about')()).toBe('About');
        });

        it('should cache base key signals', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig1 = service.translate('common:title');
            const sig2 = service.translate('common:title');
            expect(sig1).toBe(sig2);
        });

        it('should interpolate params using {{ }} syntax', async () => {
            const loader = createMockLoader({
                en: { common: { greeting: 'Hello, {{name}}!' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:greeting', { name: 'Igor' });
            expect(sig()).toBe('Hello, Igor!');
        });

        it('should interpolate params using { } syntax', async () => {
            const loader = createMockLoader({
                en: { common: { greeting: 'Hello, {name}!' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:greeting', { name: 'Igor' });
            expect(sig()).toBe('Hello, Igor!');
        });

        it('should return uncached signal for parameterized calls (memory leak prevention)', async () => {
            const loader = createMockLoader({
                en: { common: { greeting: 'Hello, {name}!' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig1 = service.translate('common:greeting', { name: 'A' });
            const sig2 = service.translate('common:greeting', { name: 'B' });
            expect(sig1).not.toBe(sig2);
        });

        it('should auto-trigger namespace loading from key prefix', async () => {
            const loader = createMockLoader({
                en: { settings: { theme: 'Dark' } },
            });
            const service = createService({ loader, coreNamespaces: [] });

            const sig = service.translate('settings:theme');

            // Wait for the async load to complete
            await new Promise((r) => setTimeout(r, 20));
            expect(sig()).toBe('Dark');
        });
    });

    // ── instant() ─────────────────────────────────────────────────────

    describe('instant()', () => {
        it('should return the translation string synchronously', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello World' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:title')).toBe('Hello World');
        });

        it('should return empty string when namespace is not loaded (FOUC prevention)', () => {
            const loader = createMockLoader({});
            const service = createService({ loader });

            expect(service.instant('missing:key')).toBe('');
        });

        it('should return the raw key when namespace IS loaded but key is missing', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:nonexistent.key')).toBe('common:nonexistent.key');
        });

        it('should invoke missingKeyHandler for missing keys in loaded namespaces', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({
                loader,
                missingKeyHandler: (key, ctx) => `[MISSING: ${ctx.namespace}/${key}]`,
            });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:nonexistent')).toBe('[MISSING: common/common:nonexistent]');
        });

        it('should interpolate params', async () => {
            const loader = createMockLoader({
                en: { common: { count: '{n} items' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:count', { n: 42 })).toBe('42 items');
        });
    });

    // ── select() ──────────────────────────────────────────────────────

    describe('select()', () => {
        it('should return undefined before namespace loads (Truthiness Trap fix)', () => {
            const loader = createMockLoader({});
            const service = createService({ loader, coreNamespaces: [] });

            const scope = service.select('unloaded');
            expect(scope()).toBeUndefined();
        });

        it('should return data after namespace loads', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const scope = service.select('common');
            expect(scope()).toBeDefined();
            expect((scope() as any).title).toBe('Hello');
        });

        it('should return proxy-wrapped data for safe deep access', async () => {
            const loader = createMockLoader({
                en: { common: { nav: { home: 'Home' } } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const scope = service.select('common');
            const data = scope()!;
            expect((data as any).nav.home).toBe('Home');
        });

        it('should return safe proxy for missing keys', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const scope = service.select('common');
            const data = scope()!;
            expect(() => (data as any).nonexistent.deeply.nested).not.toThrow();
        });

        it('should cache select() signals for same namespace', () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });

            const a = service.select('common');
            const b = service.select('common');
            expect(a).toBe(b);
        });
    });

    // ── setLang() ─────────────────────────────────────────────────────

    describe('setLang()', () => {
        it('should switch the language signal', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
                'pt-BR': { common: { title: 'Olá' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.lang()).toBe('en');
            await service.setLang('pt-BR');
            expect(service.lang()).toBe('pt-BR');
        });

        it('should reload cached namespaces for new language', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
                'pt-BR': { common: { title: 'Olá' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            await service.setLang('pt-BR');

            expect(loader).toHaveBeenCalledWith('pt-BR', 'common');
        });

        it('should update translate() signals after lang switch', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
                'pt-BR': { common: { title: 'Olá' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:title');
            expect(sig()).toBe('Hello');

            await service.setLang('pt-BR');
            expect(sig()).toBe('Olá');
        });

        it('should warn and skip unsupported languages', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            const warnSpy = mock(() => { });
            console.warn = warnSpy;

            await service.setLang('fr');

            expect(service.lang()).toBe('en');
            expect(warnSpy).toHaveBeenCalled();
        });
    });

    // ── ready signal ──────────────────────────────────────────────────

    describe('ready signal', () => {
        it('should be false before core namespaces load', () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            expect(service.ready()).toBe(false);
        });

        it('should be true after all core namespaces load', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);
            expect(service.ready()).toBe(true);
        });
    });

    // ── Fallback Language Chains ──────────────────────────────────────

    describe('fallback chains', () => {
        it('should deep-merge fallback translations', async () => {
            const loader = createMockLoader({
                en: { common: { nav: { home: 'Home', about: 'About', contact: 'Contact' } } },
                'pt-BR': { common: { nav: { home: 'Início' } } },
            });
            const service = createService({
                loader,
                defaultLang: 'pt-BR',
                fallbackChain: { 'pt-BR': ['en'] },
                coreNamespaces: ['common'],
            });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:nav.home')).toBe('Início');
            expect(service.instant('common:nav.about')).toBe('About');
            expect(service.instant('common:nav.contact')).toBe('Contact');
        });

        it('should handle deeply nested fallback merging', async () => {
            const loader = createMockLoader({
                en: { common: { settings: { theme: { dark: 'Dark', light: 'Light' } } } },
                es: { common: { settings: { theme: { dark: 'Oscuro' } } } },
                'es-AR': { common: {} },
            });
            const service = createService({
                loader,
                defaultLang: 'es-AR',
                supportedLangs: ['en', 'es', 'es-AR'],
                fallbackChain: { 'es-AR': ['es', 'en'] },
                coreNamespaces: ['common'],
            });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:settings.theme.dark')).toBe('Oscuro');
            expect(service.instant('common:settings.theme.light')).toBe('Light');
        });
    });

    // ── Colon Separator ───────────────────────────────────────────────

    describe('colon separator', () => {
        it('should parse namespace:key.path correctly', async () => {
            const loader = createMockLoader({
                en: { app: { errors: { not_found: 'Not found' } } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['app']);

            expect(service.instant('app:errors.not_found')).toBe('Not found');
        });

        it('should return full key when no separator found', () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });

            expect(service.instant('no_namespace')).toBe('no_namespace');
        });
    });
});
