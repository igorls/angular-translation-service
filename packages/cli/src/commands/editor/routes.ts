import type { DiscoveryResult } from '../discover';
import type { HandlerContext, CorsHeaders, UsageCache, ScanCache } from './types';

import { handleConfig } from './handlers/config';
import { handleGetTranslation, handlePutTranslation } from './handlers/translations';
import { handleProgress } from './handlers/progress';
import { handleGetUsage, handleRefreshUsage } from './handlers/usage';
import { handleAddKey, handleDeleteKey } from './handlers/keys';
import { handleAddLanguage } from './handlers/language';
import { handleLLMStatus, handleTranslate } from './handlers/llm';
import { handleValidate } from './handlers/validate';
import { handleScan, handleScanContext, handleScanExport } from './handlers/scan';

// ─── API Router ─────────────────────────────────────────────

export async function handleAPI(
    req: Request,
    path: string,
    discovery: DiscoveryResult,
    corsHeaders: CorsHeaders,
    srcDir: string,
    getUsageCache: () => UsageCache | null,
    setUsageCache: (c: UsageCache) => void,
    getScanCache: () => ScanCache | null,
    setScanCache: (c: ScanCache) => void,
): Promise<Response> {
    const ctx: HandlerContext = { discovery, corsHeaders, srcDir, getUsageCache, setUsageCache, getScanCache, setScanCache };

    try {
        // GET /api/config
        if (path === '/api/config' && req.method === 'GET') {
            return handleConfig(req, ctx);
        }

        // GET /api/translations/:lang/:ns
        const getMatch = path.match(/^\/api\/translations\/([^/]+)\/([^/]+)$/);
        if (getMatch && req.method === 'GET') {
            return handleGetTranslation(req, getMatch[1], getMatch[2], ctx);
        }

        // PUT /api/translations/:lang/:ns
        const putMatch = path.match(/^\/api\/translations\/([^/]+)\/([^/]+)$/);
        if (putMatch && req.method === 'PUT') {
            return handlePutTranslation(req, putMatch[1], putMatch[2], ctx);
        }

        // GET /api/progress
        if (path === '/api/progress' && req.method === 'GET') {
            return handleProgress(req, ctx);
        }

        // GET /api/usage
        if (path === '/api/usage' && req.method === 'GET') {
            return handleGetUsage(req, ctx);
        }

        // POST /api/usage/refresh
        if (path === '/api/usage/refresh' && req.method === 'POST') {
            return handleRefreshUsage(req, ctx);
        }

        // POST /api/add-key
        if (path === '/api/add-key' && req.method === 'POST') {
            return handleAddKey(req, ctx);
        }

        // POST /api/delete-key
        if (path === '/api/delete-key' && req.method === 'POST') {
            return handleDeleteKey(req, ctx);
        }

        // POST /api/add-language
        if (path === '/api/add-language' && req.method === 'POST') {
            return handleAddLanguage(req, ctx);
        }

        // GET /api/llm/status — multi-provider status check
        if (path === '/api/llm/status' && req.method === 'GET') {
            return handleLLMStatus(req, ctx);
        }

        // GET /api/ollama-status — backwards compat redirect
        if (path === '/api/ollama-status' && req.method === 'GET') {
            const url = new URL(req.url);
            const host = url.searchParams.get('host') || 'localhost:11434';
            const redirectUrl = new URL(req.url);
            redirectUrl.pathname = '/api/llm/status';
            redirectUrl.searchParams.set('provider', 'ollama');
            redirectUrl.searchParams.set('host', host);
            return handleLLMStatus(new Request(redirectUrl.toString(), req), ctx);
        }

        // POST /api/translate
        if (path === '/api/translate' && req.method === 'POST') {
            return handleTranslate(req, ctx);
        }

        // GET /api/validate
        if (path === '/api/validate' && req.method === 'GET') {
            return handleValidate(req, ctx);
        }

        // GET /api/scan
        if (path === '/api/scan' && req.method === 'GET') {
            return handleScan(req, ctx);
        }

        // GET /api/scan/context
        if (path === '/api/scan/context' && req.method === 'GET') {
            return handleScanContext(req, ctx);
        }

        // GET /api/scan/export
        if (path === '/api/scan/export' && req.method === 'GET') {
            return handleScanExport(req, ctx);
        }

        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (err) {
        console.error('API error:', err);
        return Response.json(
            { error: (err as Error).message },
            { status: 500, headers: corsHeaders },
        );
    }
}
