/**
 * Detects the user's preferred language from available sources.
 *
 * Detection chain (first match wins):
 * 1. Cookie (if key provided)
 * 2. localStorage (if key provided)
 * 3. navigator.language / navigator.languages
 * 4. Default language
 */
export function detectLanguage(
    supportedLangs: string[],
    defaultLang: string,
    options?: { cookieKey?: string; storageKey?: string },
): string {
    // 1. Cookie
    if (options?.cookieKey && typeof document !== 'undefined') {
        const match = document.cookie.match(
            new RegExp(`(?:^|;\\s*)${options.cookieKey}=([^;]*)`),
        );
        if (match?.[1] && supportedLangs.includes(match[1])) {
            return match[1];
        }
    }

    // 2. localStorage
    if (options?.storageKey && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(options.storageKey);
        if (stored && supportedLangs.includes(stored)) {
            return stored;
        }
    }

    // 3. Browser detection
    if (typeof navigator !== 'undefined' && navigator.language) {
        const languages = navigator.languages ?? [navigator.language];
        for (const browserLang of languages) {
            if (!browserLang) continue;
            // Exact match
            if (supportedLangs.includes(browserLang)) {
                return browserLang;
            }
            // Base language match (e.g., 'pt' from 'pt-BR')
            const baseLang = browserLang.split('-')[0];
            const match = supportedLangs.find(
                (l) => l === baseLang || l.startsWith(baseLang + '-'),
            );
            if (match) return match;
        }
    }

    // 4. Default
    return defaultLang;
}
