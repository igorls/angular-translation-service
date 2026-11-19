import '@angular/compiler';
import { describe, expect, it } from 'bun:test';
import {
    EnvironmentInjector,
    Injector,
    REQUEST,
    createEnvironmentInjector,
} from '@angular/core';
import { CURRENT_LANGUAGE } from '../../src/types';
import { provideTranslationSSR } from './provide-translation-ssr';

function languageFrom(providers: unknown[]) {
    const parent = Injector.create({ providers: [] });
    const env = createEnvironmentInjector(providers as never, parent as EnvironmentInjector);
    return env.get(CURRENT_LANGUAGE);
}

describe('provideTranslationSSR', () => {
    it('passes the injected request to langFromRequest', () => {
        const request = {
            headers: {
                get(name: string) {
                    return name === 'accept-language' ? 'pt-BR,en;q=0.8' : null;
                },
            },
        };
        const lang = languageFrom([
            { provide: REQUEST, useValue: request },
            provideTranslationSSR({
                langFromRequest: (req) => {
                    const headers = (req as typeof request | null)?.headers;
                    const accept = headers?.get('accept-language') ?? 'en';
                    return accept.split(',')[0];
                },
            }),
        ]);
        expect(lang).toBe('pt-BR');
    });

    it('passes null when no request token is available', () => {
        let seen: unknown = 'unset';
        const lang = languageFrom([
            provideTranslationSSR({
                langFromRequest: (req) => {
                    seen = req;
                    return 'en';
                },
            }),
        ]);
        expect(lang).toBe('en');
        expect(seen).toBeNull();
    });
});
