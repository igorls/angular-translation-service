/**
 * Shared utility for resolving the default/reference language
 * from discovered locale directories.
 *
 * Fixes Issue #4: CLI commands previously used the alphabetically first
 * locale folder, ignoring the user's configured defaultLang.
 */

/**
 * Resolves the default (reference) language from available locale directories.
 *
 * @param langDirs - Sorted list of discovered language directory names
 * @param explicit - Explicit language code from --default-lang CLI option
 * @returns The resolved default language code
 */
export function resolveDefaultLang(langDirs: string[], explicit?: string): string {
    if (!explicit) {
        return langDirs[0];
    }

    if (!langDirs.includes(explicit)) {
        console.error(
            `❌ --default-lang "${explicit}" not found in available languages: ${langDirs.join(', ')}`,
        );
        process.exit(1);
    }

    return explicit;
}
