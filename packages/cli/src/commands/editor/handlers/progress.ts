import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { collectFlatKeys } from '../../utils';
import { getNestedValue } from '../helpers';
import { parseProvideTranslationConfig } from './config';
import type { HandlerContext } from '../types';

/** GET /api/progress */
export async function handleProgress(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const appConfig = parseProvideTranslationConfig(ctx.srcDir);
    const defaultLang = appConfig.defaultLang || ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);

    // Count reference keys
    const refFiles = existsSync(defaultDir)
        ? readdirSync(defaultDir).filter((f) => f.endsWith('.json'))
        : [];

    const refKeys: Record<string, string[]> = {};
    let totalRefKeys = 0;
    for (const file of refFiles) {
        const ns = file.replace('.json', '');
        const data = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const keys = collectFlatKeys(data);
        refKeys[ns] = keys;
        totalRefKeys += keys.length;
    }

    // Per-language completion
    const progress: Record<string, { translated: number; total: number; percentage: number; byNamespace: Record<string, { translated: number; total: number }> }> = {};

    for (const lang of ctx.discovery.languages) {
        const langDir = join(ctx.discovery.i18nDir, lang);
        let translated = 0;
        const byNamespace: Record<string, { translated: number; total: number }> = {};

        for (const [ns, keys] of Object.entries(refKeys)) {
            const filePath = join(langDir, `${ns}.json`);
            let nsTranslated = 0;

            if (existsSync(filePath)) {
                const data = JSON.parse(readFileSync(filePath, 'utf-8'));
                for (const key of keys) {
                    const val = getNestedValue(data, key);
                    if (typeof val === 'string' && val !== '') nsTranslated++;
                }
            }

            byNamespace[ns] = { translated: nsTranslated, total: keys.length };
            translated += nsTranslated;
        }

        const pct = totalRefKeys > 0 ? Math.round((translated / totalRefKeys) * 100) : 100;
        progress[lang] = { translated, total: totalRefKeys, percentage: pct, byNamespace };
    }

    return Response.json({ progress, defaultLang }, { headers: ctx.corsHeaders });
}
