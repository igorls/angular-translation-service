/**
 * Detects the user's preferred language from available sources.
 *
 * Detection chain (first match wins):
 * 1. Cookie (if key provided)
 * 2. localStorage (if key provided)
 * 3. navigator.language / navigator.languages
 * 4. Default language
 */

/**
 * Pick the best supported tag for a single browser locale.
 *
 * Preference order:
 * 1. Exact tag (`en-US` → `en-US`)
 * 2. Exact base tag (`en-US` → `en`) over a different regional sibling
 * 3. Another regional variant (`en-US` → `en-GB`) when the base tag is absent
 */
export function matchSupportedLanguage(
    supportedLangs: readonly string[],
    candidate: string,
): string | undefined {
    if (!candidate) return undefined;
    if (supportedLangs.includes(candidate)) return candidate;

    const base = candidate.split('-')[0];
    if (!base) return undefined;
    if (supportedLangs.includes(base)) return base;

    return supportedLangs.find((lang) => lang.startsWith(`${base}-`));
}

/** First supported match across an ordered browser language list. */
export function matchBrowserLanguages(
    supportedLangs: readonly string[],
    browserLangs: readonly string[],
): string | undefined {
    for (const browserLang of browserLangs) {
        if (!browserLang) continue;
        const match = matchSupportedLanguage(supportedLangs, browserLang);
        if (match) return match;
    }
    return undefined;
}

/** localStorage reads can throw in private mode; treat that as "no preference". */
export function readStorage(key: string): string | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** localStorage writes must not block a language switch. */
export function writeStorage(key: string, value: string): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, value);
    } catch {
        // Privacy mode and quota errors are ignored.
    }
}

function readCookie(key: string): string | undefined {
    if (typeof document === 'undefined' || typeof document.cookie !== 'string') return undefined;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
    if (!match?.[1]) return undefined;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export function detectLanguage(
    supportedLangs: string[],
    defaultLang: string,
    options?: { cookieKey?: string; storageKey?: string },
): string {
    // 1. Cookie
    if (options?.cookieKey) {
        const fromCookie = readCookie(options.cookieKey);
        if (fromCookie && supportedLangs.includes(fromCookie)) {
            return fromCookie;
        }
    }

    // 2. localStorage
    if (options?.storageKey) {
        const stored = readStorage(options.storageKey);
        if (stored && supportedLangs.includes(stored)) {
            return stored;
        }
    }

    // 3. Browser detection
    if (typeof navigator !== 'undefined' && navigator.language) {
        const languages = navigator.languages ?? [navigator.language];
        const match = matchBrowserLanguages(supportedLangs, languages);
        if (match) return match;
    }

    // 4. Default
    return defaultLang;
}
