import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { validateTranslations } from './validate';

const TEST_DIR = '/tmp/ats-test-validate';

describe('validateTranslations', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    function setupLanguages(
        data: Record<string, Record<string, Record<string, unknown>>>,
    ) {
        for (const [lang, namespaces] of Object.entries(data)) {
            const langDir = join(TEST_DIR, lang);
            mkdirSync(langDir, { recursive: true });
            for (const [ns, content] of Object.entries(namespaces)) {
                writeFileSync(
                    join(langDir, `${ns}.json`),
                    JSON.stringify(content, null, 2),
                );
            }
        }
    }

    it('should report no issues when translations are in sync', async () => {
        setupLanguages({
            en: { common: { title: 'Hello', nav: { home: 'Home' } } },
            'pt-BR': { common: { title: 'Olá', nav: { home: 'Início' } } },
        });

        const results = await validateTranslations({ input: TEST_DIR });
        expect(results).toHaveLength(0);
    });

    it('should detect missing keys in target language', async () => {
        setupLanguages({
            en: { common: { title: 'Hello', subtitle: 'World', nav: { home: 'Home' } } },
            'pt-BR': { common: { title: 'Olá' } },
        });

        const results = await validateTranslations({ input: TEST_DIR });
        expect(results).toHaveLength(1);
        expect(results[0].missing).toContain('subtitle');
        expect(results[0].missing).toContain('nav.home');
    });

    it('should detect extra keys in target language', async () => {
        setupLanguages({
            en: { common: { title: 'Hello' } },
            'pt-BR': { common: { title: 'Olá', orphan: 'Extra key' } },
        });

        const results = await validateTranslations({ input: TEST_DIR });
        expect(results).toHaveLength(1);
        expect(results[0].extra).toContain('orphan');
    });

    it('should detect empty values', async () => {
        setupLanguages({
            en: { common: { title: 'Hello', subtitle: 'World' } },
            'pt-BR': { common: { title: 'Olá', subtitle: '' } },
        });

        const results = await validateTranslations({ input: TEST_DIR });
        expect(results).toHaveLength(1);
        expect(results[0].empty).toContain('subtitle');
    });

    it('should handle missing entire namespace in target', async () => {
        setupLanguages({
            en: { common: { title: 'Hello' }, settings: { theme: 'Dark' } },
            'pt-BR': { common: { title: 'Olá' } },
        });

        const results = await validateTranslations({ input: TEST_DIR });
        // settings namespace is missing entirely from pt-BR
        const settingsResult = results.find((r) => r.namespace === 'settings');
        expect(settingsResult).toBeDefined();
        expect(settingsResult!.missing).toContain('theme');
    });

    it('should validate across multiple target languages', async () => {
        setupLanguages({
            en: { common: { title: 'Hello', subtitle: 'World' } },
            'pt-BR': { common: { title: 'Olá' } },
            es: { common: { title: 'Hola', subtitle: 'Mundo' } },
        });

        const results = await validateTranslations({ input: TEST_DIR });
        // pt-BR is missing subtitle, es is complete
        const ptResult = results.find((r) => r.lang === 'pt-BR');
        expect(ptResult).toBeDefined();
        expect(ptResult!.missing).toContain('subtitle');

        const esResult = results.find((r) => r.lang === 'es');
        expect(esResult).toBeUndefined(); // No issues for es
    });
});
