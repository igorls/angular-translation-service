import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { writeJsonFile } from '../../utils';
import { removeNestedKey } from '../helpers';
import type { HandlerContext } from '../types';

/** POST /api/add-key */
export async function handleAddKey(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const body = await req.json() as { namespace: string; key: string; values: Record<string, string> };

    for (const lang of ctx.discovery.languages) {
        const filePath = join(ctx.discovery.i18nDir, lang, `${body.namespace}.json`);
        let data: Record<string, unknown> = {};
        if (existsSync(filePath)) {
            data = JSON.parse(readFileSync(filePath, 'utf-8'));
        }

        const parts = body.key.split('.');
        let current = data;
        for (let i = 0; i < parts.length - 1; i++) {
            if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
                current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = body.values[lang] ?? '';

        writeJsonFile(filePath, data);
    }

    console.log(`   ➕ Added key ${body.namespace}:${body.key}`);
    return Response.json({ ok: true }, { headers: ctx.corsHeaders });
}

/** POST /api/delete-key */
export async function handleDeleteKey(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const body = await req.json() as { namespace: string; key: string };

    for (const lang of ctx.discovery.languages) {
        const filePath = join(ctx.discovery.i18nDir, lang, `${body.namespace}.json`);
        if (!existsSync(filePath)) continue;

        const data = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
        removeNestedKey(data, body.key);
        writeJsonFile(filePath, data);
    }

    console.log(`   🗑️  Deleted key ${body.namespace}:${body.key}`);
    return Response.json({ ok: true }, { headers: ctx.corsHeaders });
}
