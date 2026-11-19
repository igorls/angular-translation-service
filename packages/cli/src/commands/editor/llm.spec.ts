import { afterEach, describe, expect, it, mock } from 'bun:test';
import { callLLM, checkProviderStatus, parseJsonResponse } from './llm';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('parseJsonResponse', () => {
    it('parses raw JSON', () => {
        expect(parseJsonResponse('{"a":"b"}')).toEqual({ a: 'b' });
    });

    it('parses a fenced block', () => {
        expect(parseJsonResponse('Sure:\n```json\n{"title":"Olá"}\n```')).toEqual({
            title: 'Olá',
        });
    });

    it('throws when the model returns prose', () => {
        expect(() => parseJsonResponse('I cannot do that.')).toThrow(/Could not parse JSON/);
    });
});

describe('callLLM', () => {
    it('requires a Gemini API key before touching the network', async () => {
        const fetchMock = mock(() => Promise.resolve(new Response('{}')));
        globalThis.fetch = fetchMock as typeof fetch;
        await expect(
            callLLM({
                entries: [{ key: 'title', value: 'Hello' }],
                sourceLang: 'en',
                targetLang: 'pt-BR',
                provider: 'gemini',
                model: 'gemini-test',
                config: {},
            }),
        ).rejects.toThrow(/API key/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('surfaces OpenAI HTTP failures including a snippet of the body', async () => {
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response('rate limited', { status: 429, statusText: 'Too Many Requests' })),
        ) as typeof fetch;
        await expect(
            callLLM({
                entries: [{ key: 'title', value: 'Hello' }],
                sourceLang: 'en',
                targetLang: 'es',
                provider: 'openai',
                model: 'gpt-test',
                config: { apiKey: 'sk-test', baseUrl: 'https://example.test' },
            }),
        ).rejects.toThrow(/429/);
    });

    it('throws when Ollama returns a non-JSON completion', async () => {
        globalThis.fetch = mock(() =>
            Promise.resolve(
                new Response(JSON.stringify({ response: 'not json', done: true }), { status: 200 }),
            ),
        ) as typeof fetch;
        await expect(
            callLLM({
                entries: [{ key: 'title', value: 'Hello' }],
                sourceLang: 'en',
                targetLang: 'es',
                provider: 'ollama',
                model: 'test',
                config: { host: '127.0.0.1:9' },
            }),
        ).rejects.toThrow(/Could not parse JSON/);
    });

    it('reports an offline provider when the status request fails', async () => {
        globalThis.fetch = mock(() => Promise.reject(new Error('ECONNREFUSED'))) as typeof fetch;
        const status = await checkProviderStatus({
            provider: 'ollama',
            config: { host: '127.0.0.1:9' },
        });
        expect(status).toEqual({ online: false, models: [] });
    });

    it('rejects an unknown provider', async () => {
        await expect(
            callLLM({
                entries: [],
                sourceLang: 'en',
                targetLang: 'es',
                provider: 'nope' as 'ollama',
                model: 'x',
                config: {},
            }),
        ).rejects.toThrow(/Unsupported LLM provider/);
    });
});
