import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { collectFlatKeys } from '../../utils';
import { getNestedValue } from '../helpers';
import type { HandlerContext } from '../types';

/** GET /api/validate — structural validation across languages */
export async function handleValidate(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const defaultLang = ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);
    const refFiles = existsSync(defaultDir)
        ? readdirSync(defaultDir).filter((f) => f.endsWith('.json'))
        : [];

    const issues: Array<{
        lang: string;
        namespace: string;
        type: 'missing' | 'extra' | 'empty';
        key: string;
    }> = [];

    for (const file of refFiles) {
        const ns = file.replace('.json', '');
        const refData = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const refKeys = new Set(collectFlatKeys(refData));

        for (const lang of ctx.discovery.languages) {
            if (lang === defaultLang) continue;
            const langFile = join(ctx.discovery.i18nDir, lang, file);
            if (!existsSync(langFile)) {
                for (const key of refKeys) {
                    issues.push({ lang, namespace: ns, type: 'missing', key });
                }
                continue;
            }

            const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
            const langKeys = new Set(collectFlatKeys(langData));

            // Missing in target
            for (const key of refKeys) {
                if (!langKeys.has(key)) {
                    issues.push({ lang, namespace: ns, type: 'missing', key });
                }
            }

            // Extra in target
            for (const key of langKeys) {
                if (!refKeys.has(key)) {
                    issues.push({ lang, namespace: ns, type: 'extra', key });
                }
            }

            // Empty values
            for (const key of refKeys) {
                if (langKeys.has(key)) {
                    const val = getNestedValue(langData, key);
                    if (val === '') {
                        issues.push({ lang, namespace: ns, type: 'empty', key });
                    }
                }
            }
        }
    }

    return Response.json({
        defaultLang,
        totalIssues: issues.length,
        issues,
    }, { headers: ctx.corsHeaders });
}
