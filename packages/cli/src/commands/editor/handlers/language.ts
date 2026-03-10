import { existsSync, readdirSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { writeJsonFile } from '../../utils';
import { emptyValues } from '../helpers';
import type { HandlerContext } from '../types';

/** POST /api/add-language */
export async function handleAddLanguage(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const body = await req.json() as { code: string };
    const langCode = body.code.trim();
    if (!langCode) {
        return Response.json({ error: 'Language code required' }, { status: 400, headers: ctx.corsHeaders });
    }

    const langDir = join(ctx.discovery.i18nDir, langCode);
    if (existsSync(langDir)) {
        return Response.json({ error: 'Language already exists' }, { status: 400, headers: ctx.corsHeaders });
    }

    mkdirSync(langDir, { recursive: true });
    const defaultLang = ctx.discovery.languages[0];
    const defaultDir = join(ctx.discovery.i18nDir, defaultLang);
    const files = readdirSync(defaultDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
        const data = JSON.parse(readFileSync(join(defaultDir, file), 'utf-8'));
        const emptied = emptyValues(data);
        writeJsonFile(join(langDir, file), emptied);
    }

    ctx.discovery.languages.push(langCode);
    ctx.discovery.languages.sort();

    console.log(`   🌍 Added language: ${langCode}`);
    return Response.json({ ok: true, languages: ctx.discovery.languages }, { headers: ctx.corsHeaders });
}
