// angular-translation-service — Public API

// Core service
export { TranslationService } from './translation.service';

// Provider function
export { provideTranslation } from './provide-translation';
export type {
    MissingKeyContext,
    TranslationConfig,
    TranslationKey,
    TranslationKeyRegistry,
    TranslationNamespace,
    TranslationNamespaces,
    TranslationParams,
} from './types';
export { TRANSLATION_CONFIG, CURRENT_LANGUAGE } from './types';

// Pipe
export { TranslatePipe } from './translate.pipe';

// Proxy utility
export { createRecursiveProxy } from './recursive-proxy';

// Loader utilities
export { httpLoader, importLoader } from './loader';
export type { TranslationLoader } from './loader';
