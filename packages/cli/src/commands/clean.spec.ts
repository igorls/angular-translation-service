import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { cleanOrphans } from './clean';

const TEST_DIR = '/tmp/ats-test-clean';

describe('cleanOrphans', () => {
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

    it('should remove orphaned keys', async () => {
        setupLanguages({
            en: { common: { title: 'Hello' } },
            'pt-BR': { common: { title: 'Olá', orphan: 'Extra' } },
        });

        const results = await cleanOrphans({ input: TEST_DIR });
        expect(results).toHaveLength(1);
        expect(results[0].removed).toContain('orphan');

        // Verify file was modified
        const cleaned = JSON.parse(
            readFileSync(join(TEST_DIR, 'pt-BR', 'common.json'), 'utf-8'),
        );
        expect(cleaned.title).toBe('Olá');
        expect(cleaned.orphan).toBeUndefined();
    });

    it('should remove nested orphaned keys', async () => {
        setupLanguages({
            en: { common: { nav: { home: 'Home' } } },
            'pt-BR': { common: { nav: { home: 'Início', old_link: 'Remove me' } } },
        });

        const results = await cleanOrphans({ input: TEST_DIR });
        expect(results).toHaveLength(1);
        expect(results[0].removed).toContain('nav.old_link');

        const cleaned = JSON.parse(
            readFileSync(join(TEST_DIR, 'pt-BR', 'common.json'), 'utf-8'),
        );
        expect(cleaned.nav.home).toBe('Início');
        expect(cleaned.nav.old_link).toBeUndefined();
    });

    it('should not modify files in dry-run mode', async () => {
        setupLanguages({
            en: { common: { title: 'Hello' } },
            'pt-BR': { common: { title: 'Olá', orphan: 'Extra' } },
        });

        const results = await cleanOrphans({ input: TEST_DIR, dryRun: true });
        expect(results).toHaveLength(1);
        expect(results[0].removed).toContain('orphan');

        // File should be unchanged
        const file = JSON.parse(
            readFileSync(join(TEST_DIR, 'pt-BR', 'common.json'), 'utf-8'),
        );
        expect(file.orphan).toBe('Extra');
    });

    it('should report no issues when no orphans exist', async () => {
        setupLanguages({
            en: { common: { title: 'Hello' } },
            'pt-BR': { common: { title: 'Olá' } },
        });

        const results = await cleanOrphans({ input: TEST_DIR });
        expect(results).toHaveLength(0);
    });

    it('should use --default-lang as reference instead of alphabetically first', async () => {
        // fr is the reference — 'extra_key' in de is NOT in fr, so it's orphaned
        setupLanguages({
            fr: { common: { title: 'Bonjour' } },
            de: { common: { title: 'Hallo', extra_key: 'Orphan' } },
            en: { common: { title: 'Hello' } },
        });

        const results = await cleanOrphans({ input: TEST_DIR, dryRun: true, defaultLang: 'fr' });
        const deResult = results.find((r) => r.lang === 'de');
        expect(deResult).toBeDefined();
        expect(deResult!.removed).toContain('extra_key');
    });
});
