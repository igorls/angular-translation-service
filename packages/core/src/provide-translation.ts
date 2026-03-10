import {
    EnvironmentProviders,
    makeEnvironmentProviders,
    provideAppInitializer,
    inject,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/core';
import { TranslationConfig, TRANSLATION_CONFIG } from './types';
import { TranslationService } from './translation.service';

/**
 * TransferState key used to serialize/hydrate translations between
 * server (SSR/SSG) and client. Automatically handled — zero config needed.
 */
const TRANSLATION_STATE_KEY = makeStateKey<{
    lang: string;
    namespaces: Record<string, Record<string, unknown>>;
}>('ats-translations');

/**
 * Provides the translation system for an Angular application.
 *
 * Includes zero-config TransferState support:
 * - **SSR/SSG**: All loaded namespaces (including lazy ones) are automatically
 *   serialized into TransferState at HTML generation time via `onSerialize()`.
 * - **Client**: TransferState is hydrated synchronously before first render,
 *   preventing FOUC and hydration mismatch (NG0501).
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideTranslation({
 *       defaultLang: 'en',
 *       supportedLangs: ['en', 'pt-BR'],
 *       coreNamespaces: ['common'],
 *       loader: httpLoader('/assets/i18n'),
 *     }),
 *   ],
 * };
 */
export function provideTranslation(
    config: TranslationConfig,
): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: TRANSLATION_CONFIG, useValue: config },
        // Preload core namespaces + set up TransferState bridge
        provideAppInitializer(() => {
            const i18n = inject(TranslationService);
            const platformId = inject(PLATFORM_ID);
            const transferState = inject(TransferState);

            if (isPlatformServer(platformId)) {
                // Server/SSG: use onSerialize() which defers until HTML generation,
                // capturing ALL namespaces including lazy ones loaded by route components.
                transferState.onSerialize(TRANSLATION_STATE_KEY, () => {
                    const lang = i18n.lang();
                    const dicts = i18n.getDictionaries();
                    const langDict = dicts.get(lang);
                    const namespaces: Record<string, Record<string, unknown>> = {};
                    if (langDict) {
                        for (const [ns, data] of langDict.entries()) {
                            namespaces[ns] = data;
                        }
                    }
                    return { lang, namespaces };
                });
            } else {
                // Client: synchronously hydrate from TransferState before first render.
                // This prevents FOUC and redundant HTTP requests.
                const cached = transferState.get(TRANSLATION_STATE_KEY, null);
                if (cached) {
                    const langMap = new Map<string, Record<string, unknown>>();
                    for (const [ns, data] of Object.entries(cached.namespaces)) {
                        langMap.set(ns, data);
                    }
                    const dicts = new Map<string, Map<string, Record<string, unknown>>>();
                    dicts.set(cached.lang, langMap);
                    i18n.setDictionaries(dicts);
                    i18n.lang.set(cached.lang);
                }
            }

            return i18n.ensureNamespaces(config.coreNamespaces);
        }),
    ]);
}
