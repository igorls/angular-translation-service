import { TranslationService } from '@angular-translation-service/core';

/**
 * Payload serialized into Angular's TransferState.
 */
export interface TransferStatePayload {
    /** Language that was active during SSR */
    lang: string;

    /** All namespaces loaded during SSR: ns → flat dictionary */
    namespaces: Record<string, Record<string, unknown>>;
}

/**
 * Manages TransferState serialization/hydration for translations.
 *
 * Server: Snapshots all loaded namespaces into TransferState before render.
 * Client: Hydrates dictionaries synchronously from TransferState on bootstrap.
 *
 * Design decision (Deep Think #3): Serializes ALL namespaces loaded during
 * the SSR lifecycle — not just coreNamespaces — to prevent hydration mismatch
 * on lazy-loaded routes.
 */
export class TranslationTransferState {
    /**
     * Creates a serializable snapshot of all loaded translation data.
     * Called on the server after all translations have been resolved.
     *
     * Captures every namespace loaded during the request — including
     * lazy-loaded route namespaces — to prevent hydration mismatch.
     */
    static snapshot(service: TranslationService): TransferStatePayload {
        const lang = service.lang();
        const dicts = service.getDictionaries();
        const langDict = dicts.get(lang);

        const namespaces: Record<string, Record<string, unknown>> = {};

        if (langDict) {
            for (const [ns, data] of langDict.entries()) {
                namespaces[ns] = data;
            }
        }

        return { lang, namespaces };
    }

    /**
     * Restores translation data from a TransferState snapshot.
     * Called on the client during APP_INITIALIZER, before first render.
     *
     * This injects dictionaries synchronously, meaning:
     * - No HTTP requests needed for the initial render
     * - No flash-of-untranslated-content (FOUC)
     * - No hydration mismatch (NG0501)
     */
    static hydrate(
        service: TranslationService,
        payload: TransferStatePayload,
    ): void {
        const langMap = new Map<string, Record<string, unknown>>();

        for (const [ns, data] of Object.entries(payload.namespaces)) {
            langMap.set(ns, data);
        }

        const dicts = new Map<string, Map<string, Record<string, unknown>>>();
        dicts.set(payload.lang, langMap);

        service.setDictionaries(dicts);

        // Also set the language to match the snapshot
        // This ensures the client starts with the same language as the server
        service.lang.set(payload.lang);
    }
}
