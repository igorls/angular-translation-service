import { describe, it, expect, mock } from 'bun:test';
import { TranslationService } from './translation.service';
import type { TranslationConfig } from './types';

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
        supportedLangs: ['en', 'en-GB', 'pt-BR', 'es'],
        coreNamespaces: ['common'],
        namespaceSeparator: ':',
        detectLanguage: false,
        ...overrides,
    };
    return TranslationService.create(config, ssrLang);
}

describe('language switching races', () => {
    it('reloads a namespace requested while setLang is still in flight', async () => {
        let releasePtCommon: ((value: Record<string, unknown>) => void) | undefined;
        const loader = mock((lang: string, namespace: string) => {
            if (lang === 'pt-BR' && namespace === 'common') {
                return new Promise<Record<string, unknown>>((resolve) => {
                    releasePtCommon = resolve;
                });
            }
            const table: Record<string, Record<string, Record<string, unknown>>> = {
                en: {
                    common: { title: 'Hello' },
                    settings: { theme: 'Dark' },
                },
                'pt-BR': {
                    settings: { theme: 'Escuro' },
                },
            };
            const hit = table[lang]?.[namespace];
            if (!hit) return Promise.reject(new Error(`missing ${lang}/${namespace}`));
            return Promise.resolve(hit);
        });
        const service = createService({ loader, coreNamespaces: [] });
        await service.ensureNamespaces(['common']);

        const switching = service.setLang('pt-BR');
        await service.ensureNamespaces(['settings']);
        releasePtCommon?.({ title: 'Olá' });
        await switching;

        expect(service.lang()).toBe('pt-BR');
        expect(service.instant('common:title')).toBe('Olá');
        expect(service.instant('settings:theme')).toBe('Escuro');
    });

    it('keeps the latest language when two setLang calls overlap', async () => {
        const loader = mock(async (lang: string, namespace: string) => {
            await new Promise((resolve) => setTimeout(resolve, lang === 'pt-BR' ? 40 : 5));
            if (namespace !== 'common') return Promise.reject(new Error('missing'));
            return { title: lang };
        });
        const service = createService({ loader, supportedLangs: ['en', 'pt-BR', 'es'] });
        await service.ensureNamespaces(['common']);

        const first = service.setLang('pt-BR');
        const second = service.setLang('es');
        await Promise.all([first, second]);

        expect(service.lang()).toBe('es');
        expect(service.instant('common:title')).toBe('es');
    });

    it('still switches language when localStorage.setItem throws', async () => {
        const loader = createMockLoader({
            en: { common: { title: 'Hello' } },
            es: { common: { title: 'Hola' } },
        });
        const service = createService({ loader, storageKey: 'app-lang' });
        await service.ensureNamespaces(['common']);
        const original = globalThis.localStorage;
        (globalThis as { localStorage: Storage }).localStorage = {
            getItem: () => null,
            setItem: () => {
                throw new Error('QuotaExceeded');
            },
            removeItem: () => {},
            clear: () => {},
            key: () => null,
            length: 0,
        };
        try {
            await service.setLang('es');
            expect(service.lang()).toBe('es');
            expect(service.instant('common:title')).toBe('Hola');
        } finally {
            (globalThis as { localStorage: Storage }).localStorage = original;
        }
    });
});

describe('fallbacks, missing keys, and nested values', () => {
    it('uses the fallback when the primary loader rejects', async () => {
        const loader = mock((lang: string) => {
            if (lang === 'pt-BR') return Promise.reject(new Error('404'));
            if (lang === 'en') return Promise.resolve({ title: 'Hello', onlyEn: 'Fallback' });
            return Promise.reject(new Error('missing'));
        });
        const service = createService({
            loader,
            defaultLang: 'pt-BR',
            fallbackChain: { 'pt-BR': ['en'] },
        });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:title')).toBe('Hello');
        expect(service.instant('common:onlyEn')).toBe('Fallback');
    });

    it('does not cache a namespace when every payload is null, so a retry can succeed', async () => {
        let calls = 0;
        const loader = mock(() => {
            calls++;
            if (calls === 1) return Promise.resolve(null);
            return Promise.resolve({ title: 'Recovered' });
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:title')).toBe('');
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:title')).toBe('Recovered');
        expect(calls).toBe(2);
    });

    it('keeps a successful fallback when the primary payload is not an object', async () => {
        const loader = mock((lang: string) => {
            if (lang === 'es') return Promise.resolve(['not', 'a', 'dictionary']);
            if (lang === 'en') return Promise.resolve({ title: 'From fallback' });
            return Promise.reject(new Error('missing'));
        });
        const service = createService({
            loader,
            defaultLang: 'es',
            supportedLangs: ['es', 'en'],
            fallbackChain: { es: ['en'] },
        });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:title')).toBe('From fallback');
    });

    it('stringifies finite numeric leaves instead of treating them as missing', async () => {
        const loader = createMockLoader({
            en: { common: { version: 3, zero: 0 } },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:version')).toBe('3');
        expect(service.instant('common:zero')).toBe('0');
    });

    it('does not expose Object.prototype members through a loaded scope', async () => {
        const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        const scope = service.select('common')() as Record<string, unknown>;
        expect(scope.constructor).not.toBe(Object);
        expect((scope.toString as () => string)()).toBe('');
        expect(String((scope as { missing?: { deep?: unknown } }).missing?.deep)).toBe('');
    });
});

describe('interpolation edge cases', () => {
    it('interpolates 0 and leaves unknown placeholders intact', async () => {
        const loader = createMockLoader({
            en: { common: { count: '{count} items, hello {name}' } },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:count', { count: 0 })).toBe('0 items, hello {name}');
    });

    it('does not evaluate ICU plurals and does not rewrite their inner tokens', async () => {
        const icu = '{count, plural, one {# item} other {# items}}';
        const loader = createMockLoader({ en: { common: { items: icu } } });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:items', { count: 2 })).toBe(icu);
    });

    it('inserts replacement values that contain replacement patterns literally', async () => {
        const loader = createMockLoader({
            en: { common: { greet: 'Hello {{name}}' } },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:greet', { name: '$& $`' })).toBe('Hello $& $`');
    });

    it('supports hyphenated placeholder names', async () => {
        const loader = createMockLoader({
            en: { common: { greet: 'Hi {user-name}' } },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        expect(service.instant('common:greet', { 'user-name': 'Igor' })).toBe('Hi Igor');
    });
});

describe('hydration and caching', () => {
    it('reloads hydrated lazy namespaces on the next language switch', async () => {
        const loader = createMockLoader({
            en: {
                common: { title: 'Hello' },
                settings: { theme: 'Dark' },
            },
            es: {
                common: { title: 'Hola' },
                settings: { theme: 'Oscuro' },
            },
        });
        const service = createService({ loader, coreNamespaces: ['common'] });
        const hydrated = new Map<string, Map<string, Record<string, unknown>>>();
        const langMap = new Map<string, Record<string, unknown>>();
        langMap.set('common', { title: 'Hello' });
        langMap.set('settings', { theme: 'Dark' });
        hydrated.set('en', langMap);
        service.setDictionaries(hydrated);

        await service.setLang('es');
        expect(loader).toHaveBeenCalledWith('es', 'common');
        expect(loader).toHaveBeenCalledWith('es', 'settings');
        expect(service.instant('settings:theme')).toBe('Oscuro');
    });

    it('deduplicates concurrent loads of different in-flight namespaces', async () => {
        let commonCalls = 0;
        const loader = mock((lang: string, namespace: string) => {
            if (namespace === 'common') commonCalls++;
            return Promise.resolve(namespace === 'common' ? { title: lang } : { theme: 'Dark' });
        });
        const service = createService({ loader, coreNamespaces: [] });
        await Promise.all([
            service.ensureNamespaces(['common', 'settings']),
            service.ensureNamespaces(['common']),
            service.translate('settings:theme')(),
        ]);
        expect(commonCalls).toBe(1);
        expect(service.instant('common:title')).toBe('en');
        expect(service.instant('settings:theme')).toBe('Dark');
    });

    it('prefers the exact base language over a regional sibling', () => {
        const original = globalThis.navigator;
        Object.defineProperty(globalThis, 'navigator', {
            value: { language: 'en-US', languages: ['en-US'] },
            configurable: true,
        });
        try {
            const loader = createMockLoader({});
            const service = createService({
                loader,
                detectLanguage: true,
                supportedLangs: ['en-GB', 'en', 'es'],
                defaultLang: 'es',
            });
            expect(service.lang()).toBe('en');
        } finally {
            Object.defineProperty(globalThis, 'navigator', {
                value: original,
                configurable: true,
            });
        }
    });
});
