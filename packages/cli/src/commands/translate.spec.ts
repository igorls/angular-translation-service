import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { translateKeys } from './translate';

const TEST_DIR = '/tmp/ats-test-translate';
const I18N_DIR = join(TEST_DIR, 'i18n');

describe('translateKeys file IO', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(join(I18N_DIR, 'en'), { recursive: true });
        mkdirSync(join(I18N_DIR, 'pt-BR'), { recursive: true });
    });

    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('names the file when the default namespace is not valid JSON', async () => {
        const file = join(I18N_DIR, 'en', 'common.json');
        writeFileSync(file, '{ "title": ');
        writeFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), '{}');

        await expect(
            translateKeys({
                input: I18N_DIR,
                locale: 'pt-BR',
                model: 'unused',
                host: 'http://127.0.0.1:9',
                defaultLang: 'en',
            }),
        ).rejects.toThrow(`Malformed JSON in ${file}`);
    });

    it('rejects a JSON array used as a namespace document', async () => {
        writeFileSync(join(I18N_DIR, 'en', 'common.json'), '["title"]');
        writeFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), '{}');

        await expect(
            translateKeys({
                input: I18N_DIR,
                locale: 'pt-BR',
                model: 'unused',
                host: 'http://127.0.0.1:9',
                defaultLang: 'en',
            }),
        ).rejects.toThrow('expected a JSON object');
    });

    it('exits when the i18n directory does not exist', async () => {
        const originalExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('exit');
        }) as typeof process.exit;
        try {
            await expect(
                translateKeys({
                    input: join(TEST_DIR, 'missing'),
                    locale: 'pt-BR',
                    model: 'unused',
                    host: 'http://127.0.0.1:9',
                }),
            ).rejects.toThrow('exit');
            expect(exitCode).toBe(1);
        } finally {
            process.exit = originalExit;
        }
    });

    it('writes auto-accepted translations parsed from a fenced model response', async () => {
        writeFileSync(join(I18N_DIR, 'en', 'common.json'), JSON.stringify({ title: 'Hello' }));
        writeFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), '{}');
        const original = globalThis.fetch;
        const urls: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            urls.push(String(input));
            return Response.json({ response: '```json\n{"title":"Olá"}\n```', done: true });
        }) as typeof fetch;
        try {
            await translateKeys({
                input: I18N_DIR,
                locale: 'pt-BR',
                model: 'gemma',
                host: '127.0.0.1:9',
                autoAccept: true,
                defaultLang: 'en',
            });
        } finally {
            globalThis.fetch = original;
        }
        expect(urls).toEqual(['http://127.0.0.1:9/api/generate']);
        const written = JSON.parse(readFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), 'utf-8'));
        expect(written.title).toBe('Olá');
    });

    it('falls back to one request per key when the batch response is not OK', async () => {
        writeFileSync(join(I18N_DIR, 'en', 'common.json'), JSON.stringify({ title: 'Hello' }));
        writeFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), '{}');
        const original = globalThis.fetch;
        let calls = 0;
        globalThis.fetch = (async () => {
            calls++;
            if (calls === 1) {
                return new Response('overloaded', { status: 429, statusText: 'Too Many Requests' });
            }
            return Response.json({ response: '{"title":"Olá"}', done: true });
        }) as typeof fetch;
        try {
            await translateKeys({
                input: I18N_DIR,
                locale: 'pt-BR',
                model: 'gemma',
                host: '127.0.0.1:9',
                autoAccept: true,
                defaultLang: 'en',
            });
        } finally {
            globalThis.fetch = original;
        }
        expect(calls).toBe(2);
        const written = JSON.parse(readFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), 'utf-8'));
        expect(written.title).toBe('Olá');
    });

    it('leaves a key untranslated when the provider keeps failing', async () => {
        writeFileSync(join(I18N_DIR, 'en', 'common.json'), JSON.stringify({ title: 'Hello' }));
        const target = join(I18N_DIR, 'pt-BR', 'common.json');
        writeFileSync(target, '{}');
        const original = globalThis.fetch;
        globalThis.fetch = (async () => {
            throw new Error('ECONNREFUSED');
        }) as typeof fetch;
        try {
            await translateKeys({
                input: I18N_DIR,
                locale: 'pt-BR',
                model: 'gemma',
                host: '127.0.0.1:9',
                autoAccept: true,
                defaultLang: 'en',
            });
        } finally {
            globalThis.fetch = original;
        }
        expect(JSON.parse(readFileSync(target, 'utf-8'))).toEqual({});
    });

    it('skips a namespace that is already fully translated', async () => {
        writeFileSync(join(I18N_DIR, 'en', 'common.json'), JSON.stringify({ title: 'Hello' }));
        writeFileSync(join(I18N_DIR, 'pt-BR', 'common.json'), JSON.stringify({ title: 'Olá' }));
        const original = globalThis.fetch;
        let calls = 0;
        globalThis.fetch = (async () => {
            calls++;
            return Response.json({ response: '{}', done: true });
        }) as typeof fetch;
        try {
            await translateKeys({
                input: I18N_DIR,
                locale: 'pt-BR',
                model: 'gemma',
                host: '127.0.0.1:9',
                defaultLang: 'en',
            });
        } finally {
            globalThis.fetch = original;
        }
        expect(calls).toBe(0);
    });
});
