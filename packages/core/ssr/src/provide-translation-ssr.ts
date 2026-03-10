import {
    EnvironmentProviders,
    makeEnvironmentProviders,
} from '@angular/core';
import { CURRENT_LANGUAGE } from '@angular-translation-service/core';

export interface TranslationSSRConfig {
    /** Extract language from the incoming HTTP request */
    langFromRequest: (req: unknown) => string;
}

/**
 * Provides SSR-specific language detection from the HTTP request.
 *
 * **When to use**: Dynamic SSR (Express/Hono) where the language
 * should be detected from request headers or cookies.
 *
 * **When NOT needed**: SSG (`outputMode: "static"`) — language is
 * determined at build time and TransferState is handled automatically
 * by `provideTranslation()`.
 *
 * TransferState serialization/hydration is now built into the core
 * `provideTranslation()`. This provider only adds the `CURRENT_LANGUAGE`
 * injection token from the HTTP request.
 *
 * @example
 * ```ts
 * // app.config.server.ts
 * import { provideTranslationSSR } from '@angular-translation-service/core/ssr';
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
        {
            provide: CURRENT_LANGUAGE,
            useFactory: () => config.langFromRequest(null),
        },
    ]);
}
