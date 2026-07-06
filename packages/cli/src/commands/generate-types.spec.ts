import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { generateTypes } from './generate-types';

const TEST_DIR = '/tmp/ats-test-generate';
const INPUT_DIR = join(TEST_DIR, 'i18n');
const OUTPUT_FILE = join(TEST_DIR, 'i18n.generated.ts');

describe('generateTypes', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(INPUT_DIR, { recursive: true });
    });

    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('should generate type file from JSON translation files', () => {
        writeFileSync(
            join(INPUT_DIR, 'common.json'),
            JSON.stringify({ title: 'Hello', nav: { home: 'Home', about: 'About' } }),
        );

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        const output = readFileSync(OUTPUT_FILE, 'utf-8');
        expect(output).toContain("'common'");
        expect(output).toContain('I18nTypes');
        expect(output).toContain('title: string');
        expect(output).toContain('home: string');
        expect(output).toContain('about: string');
    });

    it('should include namespace constants', () => {
        writeFileSync(join(INPUT_DIR, 'app.json'), JSON.stringify({ theme: 'Dark' }));
        writeFileSync(join(INPUT_DIR, 'common.json'), JSON.stringify({ title: 'Hi' }));

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        const output = readFileSync(OUTPUT_FILE, 'utf-8');
        expect(output).toContain('I18N_NAMESPACES');
        expect(output).toContain("'app'");
        expect(output).toContain("'common'");
    });

    it('should generate flat key types with colon separator', () => {
        writeFileSync(
            join(INPUT_DIR, 'common.json'),
            JSON.stringify({ greeting: 'Hello', errors: { not_found: '404' } }),
        );

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        const output = readFileSync(OUTPUT_FILE, 'utf-8');
        expect(output).toContain('I18nKeys');
        expect(output).toContain("'common:greeting'");
    });

    it('should register generated keys with the core type registry', () => {
        writeFileSync(
            join(INPUT_DIR, 'common.json'),
            JSON.stringify({ greeting: 'Hello', errors: { not_found: '404' } }),
        );

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        const output = readFileSync(OUTPUT_FILE, 'utf-8');
        expect(output).toContain('export type I18nTranslationKey = I18nKeys[keyof I18nKeys];');
        expect(output).toContain("declare module '@angular-translation-service/core'");
        expect(output).toContain('interface TranslationKeyRegistry');
        expect(output).toContain('keys: I18nTranslationKey;');
        expect(output).toContain('namespaces: I18nTypes;');
        expect(output).toContain('export type TranslationKey = I18nTranslationKey;');
    });

    it('should detect out-of-sync types in --check mode', () => {
        writeFileSync(join(INPUT_DIR, 'common.json'), JSON.stringify({ title: 'Hello' }));

        // Generate once
        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        // Modify the source
        writeFileSync(join(INPUT_DIR, 'common.json'), JSON.stringify({ title: 'Hello', subtitle: 'World' }));

        // Check should exit with code 1 (we catch the process.exit)
        const originalExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => { exitCode = code; }) as any;

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE, check: true });

        process.exit = originalExit;
        expect(exitCode).toBe(1);
    });

    it('should pass --check when types are in sync', () => {
        writeFileSync(join(INPUT_DIR, 'common.json'), JSON.stringify({ title: 'Hello' }));

        // Generate once
        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        // Check should not exit
        const originalExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => { exitCode = code; }) as any;

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE, check: true });

        process.exit = originalExit;
        expect(exitCode).toBeUndefined();
    });

    it('should handle nested objects in type definitions', () => {
        writeFileSync(
            join(INPUT_DIR, 'common.json'),
            JSON.stringify({
                deeply: { nested: { value: 'Hello' } },
            }),
        );

        generateTypes({ input: INPUT_DIR, output: OUTPUT_FILE });

        const output = readFileSync(OUTPUT_FILE, 'utf-8');
        expect(output).toContain('deeply:');
        expect(output).toContain('nested:');
        expect(output).toContain('value: string');
    });
});
