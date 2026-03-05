import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { checkTranslations, extractKeysFromSource } from './check';

const TEST_DIR = '/tmp/ats-test-check';
const I18N_DIR = join(TEST_DIR, 'i18n');
const SRC_DIR = join(TEST_DIR, 'src');

describe('extractKeysFromSource', () => {
    it('should extract translate() calls', () => {
        const code = `const s = this.i18n.translate('common:nav.home');`;
        const { keys } = extractKeysFromSource(code);
        expect(keys).toContain('common:nav.home');
    });

    it('should extract instant() calls', () => {
        const code = `this.i18n.instant('common:greeting', { name: 'Igor' })`;
        const { keys } = extractKeysFromSource(code);
        expect(keys).toContain('common:greeting');
    });

    it('should extract pipe syntax', () => {
        const html = `<h1>{{ 'common:nav.title' | translate }}</h1>`;
        const { keys } = extractKeysFromSource(html);
        expect(keys).toContain('common:nav.title');
    });

    it('should extract select() scopes', () => {
        const code = `protected readonly common = this.i18n.select('common');`;
        const { scopes } = extractKeysFromSource(code);
        expect(scopes).toContain('common');
    });

    it('should handle multiple keys in one file', () => {
        const code = `
            const a = this.i18n.translate('common:title');
            const b = this.i18n.translate('settings:theme');
            const c = this.i18n.instant('common:greeting');
        `;
        const { keys } = extractKeysFromSource(code);
        expect(keys).toHaveLength(3);
    });
});

describe('checkTranslations', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(I18N_DIR, { recursive: true });
        mkdirSync(SRC_DIR, { recursive: true });
    });

    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('should detect missing keys (used in code but not in JSON)', async () => {
        writeFileSync(
            join(I18N_DIR, 'common.json'),
            JSON.stringify({ title: 'Hello' }),
        );
        writeFileSync(
            join(SRC_DIR, 'app.ts'),
            `this.i18n.translate('common:title');\nthis.i18n.translate('common:missing_key');`,
        );

        const result = await checkTranslations({ i18n: I18N_DIR, src: SRC_DIR });
        expect(result.missing).toContain('common:missing_key');
    });

    it('should detect unused keys (in JSON but not in code)', async () => {
        writeFileSync(
            join(I18N_DIR, 'common.json'),
            JSON.stringify({ title: 'Hello', unused_key: 'Never used' }),
        );
        writeFileSync(
            join(SRC_DIR, 'app.ts'),
            `this.i18n.translate('common:title');`,
        );

        const result = await checkTranslations({ i18n: I18N_DIR, src: SRC_DIR });
        expect(result.unused).toContain('common:unused_key');
    });

    it('should mark select() scope keys as used', async () => {
        writeFileSync(
            join(I18N_DIR, 'common.json'),
            JSON.stringify({ title: 'Hello', nav: { home: 'Home' } }),
        );
        writeFileSync(
            join(SRC_DIR, 'app.ts'),
            `protected readonly common = this.i18n.select('common');`,
        );

        const result = await checkTranslations({ i18n: I18N_DIR, src: SRC_DIR });
        // select('common') marks all common:* keys as used
        expect(result.unused).toHaveLength(0);
    });

    it('should report no issues when all keys are accounted for', async () => {
        writeFileSync(
            join(I18N_DIR, 'common.json'),
            JSON.stringify({ title: 'Hello' }),
        );
        writeFileSync(
            join(SRC_DIR, 'app.ts'),
            `this.i18n.translate('common:title');`,
        );

        const result = await checkTranslations({ i18n: I18N_DIR, src: SRC_DIR });
        expect(result.missing).toHaveLength(0);
        expect(result.unused).toHaveLength(0);
    });
});
