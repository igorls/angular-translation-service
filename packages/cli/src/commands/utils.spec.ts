import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
    collectFlatKeys,
    findFiles,
    getNestedValue,
    loadNamespaces,
    removeNestedValue,
    setNestedValue,
} from './utils';

const TEST_DIR = '/tmp/ats-test-utils';

describe('nested path helpers', () => {
    it('updates a literal dotted key without creating a parallel nest', () => {
        const data: Record<string, unknown> = {
            eventLabels: { 'lead.captured': 'A lead' },
        };
        setNestedValue(data, 'eventLabels.lead.captured', 'Um lead');
        expect(data).toEqual({
            eventLabels: { 'lead.captured': 'Um lead' },
        });
        expect(getNestedValue(data, 'eventLabels.lead.captured')).toBe('Um lead');
    });

    it('still creates nested objects for keys that do not exist yet', () => {
        const data: Record<string, unknown> = {};
        setNestedValue(data, 'nav.home', 'Home');
        expect(data).toEqual({ nav: { home: 'Home' } });
    });

    it('removes a literal dotted key and prunes the empty parent', () => {
        const data: Record<string, unknown> = {
            eventLabels: { 'lead.captured': 'A lead' },
        };
        expect(removeNestedValue(data, 'eventLabels.lead.captured')).toBe(true);
        expect(data).toEqual({});
        expect(removeNestedValue(data, 'missing.key')).toBe(false);
    });

    it('collects numeric leaves as flat keys', () => {
        expect(collectFlatKeys({ version: 2, nav: { home: 'Home' } })).toEqual([
            'version',
            'nav.home',
        ]);
    });
});

describe('loadNamespaces and findFiles', () => {
    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('names the file when JSON is malformed', () => {
        mkdirSync(TEST_DIR, { recursive: true });
        writeFileSync(join(TEST_DIR, 'common.json'), '{ "title": ');
        expect(() => loadNamespaces(TEST_DIR)).toThrow(/Malformed JSON in/);
        expect(() => loadNamespaces(TEST_DIR)).toThrow(/common\.json/);
    });

    it('rejects a JSON array root', () => {
        mkdirSync(TEST_DIR, { recursive: true });
        writeFileSync(join(TEST_DIR, 'common.json'), '["nope"]');
        expect(() => loadNamespaces(TEST_DIR)).toThrow(/expected a JSON object/);
    });

    it('throws when the directory does not exist', () => {
        expect(() => loadNamespaces(join(TEST_DIR, 'missing'))).toThrow(/Directory not found/);
    });

    it('skips broken symlinks and node_modules', () => {
        mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
        mkdirSync(join(TEST_DIR, 'src', 'node_modules'), { recursive: true });
        writeFileSync(join(TEST_DIR, 'src', 'app.html'), '<p>Hi</p>');
        writeFileSync(join(TEST_DIR, 'src', 'node_modules', 'secret.html'), '<p>Secret</p>');
        symlinkSync(join(TEST_DIR, 'does-not-exist'), join(TEST_DIR, 'src', 'broken'));

        const files = findFiles(join(TEST_DIR, 'src'), ['.html']);
        expect(files.some((file) => file.endsWith('app.html'))).toBe(true);
        expect(files.some((file) => file.includes('node_modules'))).toBe(false);
        expect(files.some((file) => file.endsWith('broken'))).toBe(false);
    });
});
