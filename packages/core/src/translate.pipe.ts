import { Pipe, PipeTransform, inject, type Signal } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * TranslatePipe — template sugar for `TranslationService.translate()`.
 *
 * Usage: {{ 'common:greeting' | translate }}
 *        {{ 'common:greeting' | translate:{ name: 'Igor' } }}
 *
 * Design: Deep Think v3 + Angular v21 Audit fix.
 * - Caches the Signal instance to avoid recreating on every CD cycle
 * - Reads the signal value via `()` so Angular's signal-based CD tracks it
 * - Triggers ensureNamespaces via translate() for lazy loading support
 * - Works in zoneless Angular v21 (no Zone.js dependency)
 */
@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
    private readonly i18n = inject(TranslationService);

    /** Cached signal to avoid GC thrashing */
    private sig?: Signal<string>;
    private lastKey?: string;
    private lastParamsStr?: string;

    transform(key: string, params?: Record<string, string | number>): string {
        const pStr = params ? JSON.stringify(params) : '';

        // Only recreate the signal when inputs change
        if (this.lastKey !== key || this.lastParamsStr !== pStr) {
            this.lastKey = key;
            this.lastParamsStr = pStr;
            // translate() safely triggers ensureNamespaces under the hood
            this.sig = this.i18n.translate(key, params);
        }

        // O(1) signal read — Angular's signal CD automatically tracks this
        return this.sig!();
    }
}
