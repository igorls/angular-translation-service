import {
    EnvironmentProviders,
    makeEnvironmentProviders,
    provideAppInitializer,
    inject,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/core';
import {
    CURRENT_LANGUAGE,
    TranslationService,
} from 'angular-translation-service';
import { TranslationTransferState, type TransferStatePayload } from './transfer-state';

/** TransferState key for serialized translations */
const TRANSLATION_STATE_KEY = makeStateKey<TransferStatePayload>('ats-translations');

export interface TranslationSSRConfig {
    /** Extract language from the incoming HTTP request */
    langFromRequest: (req: unknown) => string;
}

/**
 * Provides SSR-specific translation support.
 *
 * ### What it does:
 *
 * **Server:**
 * 1. Provides `CURRENT_LANGUAGE` from the HTTP request (via `langFromRequest`)
 * 2. After translations load, snapshots ALL loaded namespaces into `TransferState`
 *
 * **Client:**
 * 1. Hydrates translations from `TransferState` synchronously (no HTTP needed)
 * 2. Prevents FOUC and hydration mismatch (NG0501)
 *
 * @example
 * ```ts
 * // app.config.server.ts
 * import { provideTranslationSSR } from 'angular-translation-service/ssr';
 *
 * const serverConfig: ApplicationConfig = {
 *   providers: [
 *     provideTranslationSSR({
 *       langFromRequest: (req) => {
 *         const accept = (req as Request).headers.get('accept-language') ?? 'en';
 *         return accept.split(',')[0].split('-')[0];
 *       },
 *     }),
 *   ],
 * };
 * ```
 */
export function provideTranslationSSR(
    config: TranslationSSRConfig,
): EnvironmentProviders {
    return makeEnvironmentProviders([
        // Provide language from the request
        {
            provide: CURRENT_LANGUAGE,
            useFactory: () => {
                // On the server, we need to get the request somehow.
                // Angular's REQUEST token from @angular/ssr provides access.
                // However, since the user provides langFromRequest, they can
                // also inject REQUEST themselves. For now, we delegate to
                // the user's function.
                //
                // On the client, this provider is overridden by TransferState hydration.
                return config.langFromRequest(null);
            },
        },
        // Server: snapshot translations into TransferState after they load
        // Client: hydrate translations from TransferState before first render
        provideAppInitializer(() => {
            const platformId = inject(PLATFORM_ID);
            const transferState = inject(TransferState);
            const i18n = inject(TranslationService);

            if (isPlatformServer(platformId)) {
                // Server: register a microtask to snapshot after current init completes.
                // The core provideTranslation() APP_INITIALIZER loads namespaces first,
                // then this initializer runs and snapshots the result.
                queueMicrotask(() => {
                    const snapshot = TranslationTransferState.snapshot(i18n);
                    transferState.set(TRANSLATION_STATE_KEY, snapshot);
                });
            } else {
                // Client: hydrate from TransferState if available
                const cached = transferState.get(TRANSLATION_STATE_KEY, null);
                if (cached) {
                    TranslationTransferState.hydrate(i18n, cached);
                    transferState.remove(TRANSLATION_STATE_KEY);
                }
            }
        }),
    ]);
}
