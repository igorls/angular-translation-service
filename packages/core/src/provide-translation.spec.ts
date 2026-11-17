import '@angular/compiler';
import { describe, expect, it, mock } from 'bun:test';
import {
    ApplicationInitStatus,
    EnvironmentInjector,
    Injector,
    PLATFORM_ID,
    TransferState,
    createEnvironmentInjector,
    makeStateKey,
} from '@angular/core';
import { provideTranslation } from './provide-translation';
import { TranslationService } from './translation.service';
import type { TranslationConfig } from './types';

const TRANSLATION_STATE_KEY = makeStateKey<{
    lang: string;
    namespaces: Record<string, Record<string, unknown>>;
}>('ats-translations');

function config(loader: TranslationConfig['loader']): TranslationConfig {
    return {
        defaultLang: 'en',
        supportedLangs: ['en', 'pt-BR'],
        coreNamespaces: ['common'],
        detectLanguage: false,
        loader,
    };
}

function bootstrap(
    platform: 'server' | 'browser',
    translationConfig: TranslationConfig,
    seed?: { lang: string; namespaces: Record<string, Record<string, unknown>> },
) {
    const parent = Injector.create({ providers: [] });
    const env = createEnvironmentInjector(
        [
            { provide: PLATFORM_ID, useValue: platform },
            // Bypass TransferState's root factory. On Angular 19 `DOCUMENT` is not
            // a public export, and on 20 the factory requires a DOM the test
            // runner does not have. The class itself only needs its in-memory store.
            { provide: TransferState, useFactory: () => new TransferState() },
            { provide: ApplicationInitStatus, useClass: ApplicationInitStatus },
            { provide: TranslationService, useClass: TranslationService },
            provideTranslation(translationConfig),
        ],
        parent as EnvironmentInjector,
    );
    if (seed) {
        env.get(TransferState).set(TRANSLATION_STATE_KEY, seed);
    }
    const status = env.get(ApplicationInitStatus);
    status.runInitializers();
    return { env, ready: status.donePromise };
}

describe('provideTranslation TransferState', () => {
    it('serializes loaded namespaces on the server when toJson runs', async () => {
        const loader = mock(async (_lang: string, namespace: string) => {
            if (namespace === 'common') return { title: 'Hello' };
            if (namespace === 'settings') return { theme: 'Dark' };
            throw new Error(`missing ${namespace}`);
        });
        const { env, ready } = bootstrap('server', config(loader));
        await ready;

        const service = env.get(TranslationService);
        await service.ensureNamespaces(['settings']);

        const stored = JSON.parse(env.get(TransferState).toJson()) as {
            'ats-translations': { lang: string; namespaces: Record<string, Record<string, unknown>> };
        };
        expect(stored['ats-translations'].lang).toBe('en');
        expect(stored['ats-translations'].namespaces.common).toEqual({ title: 'Hello' });
        expect(stored['ats-translations'].namespaces.settings).toEqual({ theme: 'Dark' });
    });

    it('hydrates client state and skips empty namespaces without refetching them', async () => {
        const loader = mock(async () => ({ title: 'From network' }));
        const { env, ready } = bootstrap('browser', config(loader), {
            lang: 'pt-BR',
            namespaces: {
                common: { title: 'Olá' },
                empty: {},
            },
        });
        await ready;

        const service = env.get(TranslationService);
        expect(service.lang()).toBe('pt-BR');
        expect(service.instant('common:title')).toBe('Olá');
        expect(loader).not.toHaveBeenCalled();
        expect(service.instant('empty:title')).toBe('');
    });
});
