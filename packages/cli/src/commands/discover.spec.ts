import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { discoverI18nDir } from './discover';

const TEST_DIR = '/tmp/ats-test-discover';

describe('discoverI18nDir', () => {
    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('returns null when nothing matches', () => {
        mkdirSync(TEST_DIR, { recursive: true });
        expect(discoverI18nDir(TEST_DIR)).toBeNull();
    });

    it('prefers an explicit directory that contains language folders', () => {
        const i18n = join(TEST_DIR, 'custom');
        mkdirSync(join(i18n, 'en'), { recursive: true });
        writeFileSync(join(i18n, 'en', 'common.json'), '{}');
        const found = discoverI18nDir(TEST_DIR, 'custom');
        expect(found?.source).toBe('explicit');
        expect(found?.languages).toEqual(['en']);
    });

    it('returns null for an explicit path with no JSON languages', () => {
        mkdirSync(join(TEST_DIR, 'empty'), { recursive: true });
        expect(discoverI18nDir(TEST_DIR, 'empty')).toBeNull();
    });

    it('reads sourceRoot from angular.json', () => {
        mkdirSync(join(TEST_DIR, 'projects', 'app', 'src', 'i18n', 'de'), { recursive: true });
        writeFileSync(
            join(TEST_DIR, 'projects', 'app', 'src', 'i18n', 'de', 'common.json'),
            '{}',
        );
        writeFileSync(
            join(TEST_DIR, 'angular.json'),
            JSON.stringify({
                projects: { app: { sourceRoot: 'projects/app/src' } },
            }),
        );
        const found = discoverI18nDir(TEST_DIR);
        expect(found?.source).toBe('angular.json');
        expect(found?.languages).toEqual(['de']);
    });

    it('ignores a broken angular.json and falls back to convention', () => {
        mkdirSync(join(TEST_DIR, 'src', 'i18n', 'fr'), { recursive: true });
        writeFileSync(join(TEST_DIR, 'src', 'i18n', 'fr', 'common.json'), '{}');
        writeFileSync(join(TEST_DIR, 'angular.json'), '{');
        const found = discoverI18nDir(TEST_DIR);
        expect(found?.source).toBe('convention');
        expect(found?.languages).toEqual(['fr']);
    });
});
