import '@angular/compiler';
import { describe, expect, it, mock } from 'bun:test';
import { Injector, runInInjectionContext } from '@angular/core';
import { TranslatePipe } from './translate.pipe';
import { TranslationService } from './translation.service';
import { TRANSLATION_CONFIG, type TranslationConfig } from './types';

describe('TranslatePipe', () => {
    function setup(loader: TranslationConfig['loader']) {
        const config: TranslationConfig = {
            defaultLang: 'en',
            supportedLangs: ['en', 'es'],
            coreNamespaces: [],
            detectLanguage: false,
            loader,
        };
        const injector = Injector.create({
            providers: [
                { provide: TRANSLATION_CONFIG, useValue: config },
                TranslationService,
            ],
        });
        return runInInjectionContext(injector, () => new TranslatePipe());
    }

    it('reads the signal directly so a later transform sees async loads without Zone.js', async () => {
        let resolveLoad: ((value: Record<string, unknown>) => void) | undefined;
        const loader = mock(
            () =>
                new Promise<Record<string, unknown>>((resolve) => {
                    resolveLoad = resolve;
                }),
        );
        const pipe = setup(loader);

        expect(pipe.transform('common:greeting')).toBe('');
        expect(loader).toHaveBeenCalledTimes(1);

        resolveLoad?.({ greeting: 'Hello {name}' });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(pipe.transform('common:greeting')).toBe('Hello {name}');
        expect(pipe.transform('common:greeting', { name: 'Igor' })).toBe('Hello Igor');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('keeps the previous string when the key is unchanged and params are stable', async () => {
        const loader = mock(async () => ({ title: 'Hello' }));
        const pipe = setup(loader);
        pipe.transform('common:title');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(pipe.transform('common:title')).toBe('Hello');
        expect(pipe.transform('common:title')).toBe('Hello');
        expect(loader).toHaveBeenCalledTimes(1);
    });
});
