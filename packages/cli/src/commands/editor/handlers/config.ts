import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { findFiles } from '../../utils';
import type { HandlerContext } from '../types';

/**
 * Parse `provideTranslation()` calls from TypeScript source to extract
 * defaultLang and supportedLangs configuration.
 */
export function parseProvideTranslationConfig(srcDir: string): { defaultLang: string; supportedLangs: string[] } {
    const result = { defaultLang: '', supportedLangs: [] as string[] };

    try {
        const tsFiles = findFiles(srcDir, ['.ts']);

        for (const file of tsFiles) {
            if (file.includes('.spec.') || file.includes('.test.') || file.includes('node_modules')) continue;
            const content = readFileSync(file, 'utf-8');
            if (!content.includes('provideTranslation')) continue;

            // Extract defaultLang
            const defaultLangMatch = content.match(/defaultLang\s*:\s*['"]([^'"]+)['"]/);
            if (defaultLangMatch) {
                result.defaultLang = defaultLangMatch[1];
            }

            // Extract supportedLangs array
            const supportedMatch = content.match(/supportedLangs\s*:\s*\[([^\]]+)\]/);
            if (supportedMatch) {
                const items = supportedMatch[1].match(/['"]([^'"]+)['"]/g);
                if (items) {
                    result.supportedLangs = items.map((s) => s.replace(/['"]/g, ''));
                }
            }

            // Found what we need, stop searching
            if (result.defaultLang) break;
        }
    } catch {
        // Ignore parse errors
    }

    return result;
}

/** GET /api/config */
export async function handleConfig(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const namespaceInfo: Record<string, string[]> = {};
    for (const lang of ctx.discovery.languages) {
        const langDir = join(ctx.discovery.i18nDir, lang);
        if (!existsSync(langDir)) { namespaceInfo[lang] = []; continue; }
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));
        namespaceInfo[lang] = files.map((f) => f.replace('.json', ''));
    }

    const allNamespaces = [...new Set(Object.values(namespaceInfo).flat())].sort();

    // Parse provideTranslation() config from source
    const appConfig = parseProvideTranslationConfig(ctx.srcDir);

    // Config health warnings
    const configWarnings: Array<{ type: string; message: string }> = [];

    if (appConfig.defaultLang && !ctx.discovery.languages.includes(appConfig.defaultLang)) {
        configWarnings.push({
            type: 'error',
            message: `defaultLang "${appConfig.defaultLang}" has no i18n folder`,
        });
    }

    if (appConfig.supportedLangs.length > 0) {
        for (const lang of appConfig.supportedLangs) {
            if (!ctx.discovery.languages.includes(lang)) {
                configWarnings.push({
                    type: 'error',
                    message: `supportedLangs includes "${lang}" but no i18n/${lang}/ folder exists`,
                });
            }
        }
        for (const lang of ctx.discovery.languages) {
            if (!appConfig.supportedLangs.includes(lang)) {
                configWarnings.push({
                    type: 'warning',
                    message: `i18n/${lang}/ folder exists but "${lang}" is not in supportedLangs`,
                });
            }
        }
    }

    // Check for missing namespace files across languages
    for (const ns of allNamespaces) {
        const missingLangs = ctx.discovery.languages.filter((l) => !(namespaceInfo[l] || []).includes(ns));
        if (missingLangs.length > 0) {
            configWarnings.push({
                type: 'warning',
                message: `Namespace "${ns}" is missing for: ${missingLangs.join(', ')}`,
            });
        }
    }

    return Response.json({
        i18nDir: ctx.discovery.i18nDir,
        languages: ctx.discovery.languages,
        namespaces: allNamespaces,
        namespacesPerLang: namespaceInfo,
        defaultLang: appConfig.defaultLang || null,
        supportedLangs: appConfig.supportedLangs,
        configWarnings,
    }, { headers: ctx.corsHeaders });
}
