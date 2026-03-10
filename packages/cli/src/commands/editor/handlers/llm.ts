import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { writeJsonFile } from '../../utils';
import { setNestedValue } from '../helpers';
import { callLLM, checkProviderStatus } from '../llm';
import type { HandlerContext } from '../types';
import type { LLMProvider } from '../llm';

/** GET /api/llm/status — check provider connectivity and list models */
export async function handleLLMStatus(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const url = new URL(req.url);
    const provider = (url.searchParams.get('provider') || 'ollama') as LLMProvider;
    const host = url.searchParams.get('host') || 'localhost:11434';
    const baseUrl = url.searchParams.get('baseUrl') || 'https://api.openai.com';
    const apiKey = url.searchParams.get('apiKey') || '';

    const result = await checkProviderStatus({
        provider,
        config: { host, baseUrl, apiKey },
    });

    return Response.json(result, { headers: ctx.corsHeaders });
}

/** POST /api/translate — LLM translate via selected provider (SSE stream) */
export async function handleTranslate(
    req: Request,
    ctx: HandlerContext,
): Promise<Response> {
    const body = await req.json() as {
        entries: Array<{ key: string; value: string }>;
        sourceLang: string;
        targetLang: string;
        namespace: string;
        provider: LLMProvider;
        model: string;
        host?: string;
        baseUrl?: string;
        apiKey?: string;
        batchSize?: number;
    };

    const provider = body.provider || 'ollama';
    const batchSize = body.batchSize || 20;
    const totalEntries = body.entries.length;
    const totalBatches = Math.ceil(totalEntries / batchSize);
    console.log(`   🤖 Translating ${totalEntries} keys in ${totalBatches} batch(es) (${body.sourceLang} → ${body.targetLang}) via ${provider}/${body.model}...`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            const filePath = join(ctx.discovery.i18nDir, body.targetLang, `${body.namespace}.json`);
            let fileData: Record<string, unknown> = {};
            if (existsSync(filePath)) {
                fileData = JSON.parse(readFileSync(filePath, 'utf-8'));
            }

            let totalApplied = 0;

            for (let i = 0; i < totalEntries; i += batchSize) {
                const batch = body.entries.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;

                send('status', {
                    phase: 'thinking',
                    batch: batchNum,
                    totalBatches,
                    keys: batch.length,
                    message: `Batch ${batchNum}/${totalBatches} — thinking (${batch.length} keys)...`,
                });

                try {
                    const translations = await callLLM({
                        entries: batch,
                        sourceLang: body.sourceLang,
                        targetLang: body.targetLang,
                        provider,
                        model: body.model,
                        config: {
                            host: body.host,
                            baseUrl: body.baseUrl,
                            apiKey: body.apiKey,
                        },
                    });

                    // Apply and save after each batch
                    let batchApplied = 0;
                    for (const [key, translated] of Object.entries(translations)) {
                        if (typeof translated === 'string' && translated.trim()) {
                            setNestedValue(fileData, key, translated);
                            batchApplied++;
                        }
                    }
                    totalApplied += batchApplied;
                    writeJsonFile(filePath, fileData);

                    send('batch', {
                        batch: batchNum,
                        totalBatches,
                        translations,
                        applied: batchApplied,
                        totalApplied,
                        namespace: body.namespace,
                    });

                    console.log(`   ✅ Batch ${batchNum}/${totalBatches}: applied ${batchApplied} keys.`);
                } catch (err) {
                    send('error', {
                        batch: batchNum,
                        message: (err as Error).message,
                    });
                    console.error(`   ❌ Batch ${batchNum} failed: ${(err as Error).message}`);
                }
            }

            send('done', { totalApplied, total: totalEntries });
            console.log(`   ✅ All done: ${totalApplied}/${totalEntries} translations applied.`);
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            ...ctx.corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
