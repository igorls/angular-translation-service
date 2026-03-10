import { describe, it, expect, beforeEach } from 'bun:test';
import { TranslationService } from '../../src/translation.service';
import type { TranslationConfig } from '../../src/types';
import { TranslationTransferState } from './transfer-state';

/**
 * Creates a mock loader that returns pre-configured dictionaries.
 */
function createMockLoader(data: Record<string, Record<string, Record<string, unknown>>>) {
    return (lang: string, namespace: string) => {
        const langData = data[lang];
        if (!langData || !langData[namespace]) {
            return Promise.reject(new Error(`No data for ${lang}/${namespace}`));
        }
        return Promise.resolve(structuredClone(langData[namespace]));
    };
}

function createService(
    overrides: Partial<TranslationConfig> & { loader: TranslationConfig['loader'] },
    ssrLang?: string,
): TranslationService {
    const config: TranslationConfig = {
        defaultLang: 'en',
        supportedLangs: ['en', 'pt-BR'],
        coreNamespaces: ['common'],
        detectLanguage: false,
        ...overrides,
    };
    return TranslationService.create(config, ssrLang);
}

// ── Core Service SSR Hooks ────────────────────────────────────────────

describe('TranslationService SSR hooks', () => {
    it('getDictionaries() should return current dictionary state', async () => {
        const loader = createMockLoader({
            en: { common: { title: 'Hello' } },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);

        const dicts = service.getDictionaries();
        expect(dicts.size).toBe(1);
        expect(dicts.get('en')?.has('common')).toBe(true);
    });

    it('setDictionaries() should replace dictionary state', async () => {
        const loader = createMockLoader({
            en: { common: { title: 'Hello' } },
        });
        const service = createService({ loader });

        // Inject pre-loaded dictionaries (simulating hydration)
        const hydrated = new Map<string, Map<string, Record<string, unknown>>>();
        const langMap = new Map<string, Record<string, unknown>>();
        langMap.set('common', { title: 'Hydrated' });
        hydrated.set('en', langMap);

        service.setDictionaries(hydrated);

        expect(service.instant('common:title')).toBe('Hydrated');
        expect(service.ready()).toBe(true);
    });

    it('setDictionaries() should not trigger additional HTTP loads for hydrated namespaces', async () => {
        let loadCount = 0;
        const loader = (lang: string, ns: string) => {
            loadCount++;
            return Promise.resolve({ title: 'From HTTP' });
        };
        const service = createService({ loader });

        // Hydrate first
        const hydrated = new Map<string, Map<string, Record<string, unknown>>>();
        const langMap = new Map<string, Record<string, unknown>>();
        langMap.set('common', { title: 'From Transfer' });
        hydrated.set('en', langMap);
        service.setDictionaries(hydrated);

        // Now call ensureNamespaces — should skip since already loaded
        await service.ensureNamespaces(['common']);

        expect(loadCount).toBe(0);
        expect(service.instant('common:title')).toBe('From Transfer');
    });

    it('getDictionaries() should include lazy-loaded namespaces', async () => {
        const loader = createMockLoader({
            en: {
                common: { title: 'Hello' },
                settings: { theme: 'Dark' },
            },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common']);
        await service.ensureNamespaces(['settings']);

        const dicts = service.getDictionaries();
        const enDicts = dicts.get('en')!;
        expect(enDicts.has('common')).toBe(true);
        expect(enDicts.has('settings')).toBe(true);
    });
});

// ── TranslationTransferState ──────────────────────────────────────────

describe('TranslationTransferState', () => {
    it('snapshot() should capture all loaded namespaces', async () => {
        const loader = createMockLoader({
            en: {
                common: { title: 'Hello' },
                settings: { theme: 'Dark' },
            },
        });
        const service = createService({ loader });
        await service.ensureNamespaces(['common', 'settings']);

        const snapshot = TranslationTransferState.snapshot(service);

        expect(snapshot.lang).toBe('en');
        expect(snapshot.namespaces['common']).toEqual({ title: 'Hello' });
        expect(snapshot.namespaces['settings']).toEqual({ theme: 'Dark' });
    });

    it('hydrate() should restore dictionaries into a fresh service', () => {
        const loader = createMockLoader({});
        const service = createService({ loader });

        const payload = {
            lang: 'en',
            namespaces: {
                common: { title: 'Hydrated' },
                settings: { theme: 'Light' },
            },
        };

        TranslationTransferState.hydrate(service, payload);

        expect(service.instant('common:title')).toBe('Hydrated');
        expect(service.instant('settings:theme')).toBe('Light');
        expect(service.ready()).toBe(true);
    });

    it('snapshot → hydrate round-trip should preserve data', async () => {
        const loader = createMockLoader({
            'pt-BR': {
                common: { nav: { home: 'Início', about: 'Sobre' } },
                home: { hero: { title: 'Bem-vindo' } },
            },
        });
        const service = createService({ loader }, 'pt-BR');
        await service.ensureNamespaces(['common', 'home']);

        // Snapshot on server
        const snapshot = TranslationTransferState.snapshot(service);

        // Hydrate on client
        const clientService = createService({
            loader: createMockLoader({}),
        });
        TranslationTransferState.hydrate(clientService, snapshot);

        expect(clientService.instant('common:nav.home')).toBe('Início');
        expect(clientService.instant('common:nav.about')).toBe('Sobre');
        expect(clientService.instant('home:hero.title')).toBe('Bem-vindo');
    });
});
