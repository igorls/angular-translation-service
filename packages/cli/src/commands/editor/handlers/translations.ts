import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { writeJsonFile } from '../../utils';
import type { HandlerContext } from '../types';

/** GET /api/translations/:lang/:ns */
export async function handleGetTranslation(
    req: Request,
    lang: string,
    ns: string,
    ctx: HandlerContext,
): Promise<Response> {
    const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);

    if (!existsSync(filePath)) {
        return Response.json({ data: {} }, { headers: ctx.corsHeaders });
    }

    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return Response.json({ data }, { headers: ctx.corsHeaders });
}

/** PUT /api/translations/:lang/:ns */
export async function handlePutTranslation(
    req: Request,
    lang: string,
    ns: string,
    ctx: HandlerContext,
): Promise<Response> {
    const filePath = join(ctx.discovery.i18nDir, lang, `${ns}.json`);
    const body = await req.json() as { data: Record<string, unknown> };

    writeJsonFile(filePath, body.data);
    console.log(`   💾 Saved ${lang}/${ns}.json`);

    return Response.json({ ok: true }, { headers: ctx.corsHeaders });
}
