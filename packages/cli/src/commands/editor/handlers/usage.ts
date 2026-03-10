import { scanUsage } from '../scanner';
import type { HandlerContext } from '../types';

/** GET /api/usage */
export async function handleGetUsage(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const cache = ctx.getUsageCache();
    if (!cache) {
        return Response.json({ ready: false, usage: {} }, { headers: ctx.corsHeaders });
    }
    return Response.json({ ready: true, usage: cache }, { headers: ctx.corsHeaders });
}

/** POST /api/usage/refresh */
export async function handleRefreshUsage(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const cache = await scanUsage(ctx.srcDir, ctx.discovery);
    ctx.setUsageCache(cache);
    return Response.json({ ready: true, usage: cache }, { headers: ctx.corsHeaders });
}
