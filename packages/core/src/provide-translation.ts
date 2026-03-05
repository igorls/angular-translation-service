import {
    EnvironmentProviders,
    makeEnvironmentProviders,
    provideAppInitializer,
    inject,
} from '@angular/core';
import { TranslationConfig, TRANSLATION_CONFIG } from './types';
import { TranslationService } from './translation.service';

/**
 * Provides the translation system for an Angular application.
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
        // Preload core namespaces before app renders
        provideAppInitializer(() => {
            const i18n = inject(TranslationService);
            return i18n.ensureNamespaces(config.coreNamespaces);
        }),
    ]);
}
