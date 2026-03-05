# Directory Structure Report

This document contains files from the `/home/igorls/dev/GitHub/angular-translation-service` directory with extensions: ts, json
Custom ignored patterns: docs
Content hash: 25a14601b38f60e8

## File Tree Structure

- 📄 package.json
- 📁 packages
  - 📁 cli
    - 📁 bin
      - 📄 ats.ts
    - 📄 package.json
    - 📁 src
      - 📁 commands
        - 📄 check.ts
        - 📄 clean.ts
        - 📄 generate-types.spec.ts
        - 📄 generate-types.ts
        - 📄 translate.ts
        - 📄 validate.ts
      - 📄 index.ts
    - 📄 tsconfig.json
  - 📁 core
    - 📄 ng-package.json
    - 📄 package.json
    - 📁 src
      - 📄 index.ts
      - 📄 language-detection.spec.ts
      - 📄 language-detection.ts
      - 📄 loader.spec.ts
      - 📄 loader.ts
      - 📄 provide-translation.ts
      - 📄 recursive-proxy.spec.ts
      - 📄 recursive-proxy.ts
      - 📄 translate.pipe.ts
      - 📄 translation.service.spec.ts
      - 📄 translation.service.ts
      - 📄 types.ts
    - 📄 tsconfig.lib.json
  - 📁 ssr
    - 📄 ng-package.json
    - 📄 package.json
    - 📁 src
      - 📄 index.ts
      - 📄 provide-translation-ssr.ts
      - 📄 transfer-state.ts
    - 📄 tsconfig.lib.json
- 📄 tsconfig.json


### File: `package.json`

- Size: 1098 bytes
- Modified: 2026-03-05 03:10:25 UTC

```json
{
  "name": "angular-translation-service",
  "version": "0.0.1",
  "private": true,
  "description": "Signal-based Angular i18n library with runtime language switching, SSR hydration, and LLM-powered translation tooling",
  "author": "Igor LS",
  "license": "MIT",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build:core": "ng build core",
    "build:ssr": "ng build ssr",
    "build:cli": "bun build packages/cli/src/index.ts --outdir packages/cli/dist --target bun",
    "build": "bun run build:core && bun run build:ssr && bun run build:cli",
    "test": "bun test",
    "generate": "bun packages/cli/src/index.ts generate",
    "check": "bun packages/cli/src/index.ts check",
    "validate": "bun packages/cli/src/index.ts validate"
  },
  "devDependencies": {
    "@angular/build": "^21.0.0",
    "@angular/cli": "^21.0.0",
    "@angular/compiler-cli": "^21.0.0",
    "ng-packagr": "^21.0.0",
    "typescript": "~5.8.0"
  },
  "peerDependencies": {
    "@angular/core": "^19.0.0 || ^20.0.0 || ^21.0.0",
    "@angular/common": "^19.0.0 || ^20.0.0 || ^21.0.0"
  }
}
```

### File: `packages/cli/package.json`

- Size: 372 bytes
- Modified: 2026-03-05 03:18:03 UTC

```json
{
  "name": "@angular-translation-service/cli",
  "version": "0.0.1",
  "description": "CLI tooling for angular-translation-service: type generation, validation, LLM translation",
  "license": "MIT",
  "type": "module",
  "bin": {
    "ats": "./bin/ats.ts"
  },
  "dependencies": {
    "commander": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.3.3"
  }
}
```

### File: `packages/cli/tsconfig.json`

- Size: 230 bytes
- Modified: 2026-03-05 03:18:43 UTC

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node", "bun-types"]
  },
  "include": ["src/**/*.ts", "bin/**/*.ts"]
}
```

### File: `packages/core/package.json`

- Size: 352 bytes
- Modified: 2026-03-05 03:10:52 UTC

```json
{
  "name": "angular-translation-service",
  "version": "0.0.1",
  "description": "Signal-based Angular i18n library with runtime language switching and SSR hydration",
  "license": "MIT",
  "peerDependencies": {
    "@angular/core": "^19.0.0 || ^20.0.0 || ^21.0.0",
    "@angular/common": "^19.0.0 || ^20.0.0 || ^21.0.0"
  },
  "sideEffects": false
}
```

### File: `packages/ssr/package.json`

- Size: 457 bytes
- Modified: 2026-03-05 03:13:24 UTC

```json
{
  "name": "angular-translation-service-ssr",
  "version": "0.0.1",
  "description": "SSR support for angular-translation-service (TransferState, PendingTasks)",
  "license": "MIT",
  "peerDependencies": {
    "@angular/core": "^19.0.0 || ^20.0.0 || ^21.0.0",
    "@angular/common": "^19.0.0 || ^20.0.0 || ^21.0.0",
    "@angular/platform-server": "^19.0.0 || ^20.0.0 || ^21.0.0",
    "angular-translation-service": ">=0.0.1"
  },
  "sideEffects": false
}
```

### File: `tsconfig.json`

- Size: 597 bytes
- Modified: 2026-03-05 03:10:34 UTC

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "paths": {
      "angular-translation-service": ["./packages/core/src/index.ts"],
      "angular-translation-service/ssr": ["./packages/ssr/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

### File: `packages/cli/src/index.ts`

- Size: 3721 bytes
- Modified: 2026-03-05 03:18:51 UTC

```typescript
#!/usr/bin/env bun
/**
 * angular-translation-service CLI
 *
 * Usage:
 *   bunx angular-translation-service generate    # Generate TS types from JSON
 *   bunx angular-translation-service check       # Find missing/unused keys
 *   bunx angular-translation-service validate    # Detect duplicates/orphans
 *   bunx angular-translation-service translate   # LLM batch translation via Ollama
 *   bunx angular-translation-service clean       # Remove orphaned keys
 */

import { program } from 'commander';

program
    .name('ats')
    .description('CLI tooling for angular-translation-service')
    .version('0.0.1');

program
    .command('generate')
    .description('Generate TypeScript interfaces from JSON translation files')
    .option('-i, --input <dir>', 'i18n source directory', 'src/assets/i18n/en')
    .option('-o, --output <file>', 'Output file path', 'src/app/i18n.generated.ts')
    .option('--check', 'Assert generated file is in sync (for CI)')
    .action(async (options) => {
        const { generateTypes } = await import('./commands/generate-types');
        await generateTypes(options);
    });

program
    .command('check')
    .description('Find missing, unused, and deprecated translation keys')
    .option('--locale <locale>', 'Target locale to check', 'en')
    .option('--namespace <ns>', 'Limit to specific namespace')
    .option('--skip-unused-check', 'Skip unused key detection')
    .action(async (options) => {
        const { checkTranslations } = await import('./commands/check');
        await checkTranslations(options);
    });

program
    .command('validate')
    .description('Detect duplicate keys, values, and structural issues')
    .option('-i, --input <dir>', 'i18n source directory', 'src/assets/i18n')
    .action(async (options) => {
        const { validateTranslations } = await import('./commands/validate');
        await validateTranslations(options);
    });

program
    .command('translate')
    .description('Translate missing keys using LLM (Ollama)')
    .option('--locale <locale>', 'Target locale', 'pt-BR')
    .option('--namespace <ns>', 'Limit to specific namespace')
    .option('--model <model>', 'Ollama model to use', 'gemma3:12b')
    .option('--host <host>', 'Ollama host', '127.0.0.1:11434')
    .option('--auto-accept', 'Auto-accept all translations without prompting')
    .action(async (options) => {
        const { translateKeys } = await import('./commands/translate');
        await translateKeys(options);
    });

program
    .command('clean')
    .description('Remove orphaned keys from translation files')
    .option('-i, --input <dir>', 'i18n source directory', 'src/assets/i18n')
    .option('--dry-run', 'Show what would be removed without removing')
    .action(async (options) => {
        const { cleanOrphans } = await import('./commands/clean');
        await cleanOrphans(options);
    });

program
    .command('editor')
    .description('Launch the translation editor in your browser')
    .option('-i, --input <dir>', 'i18n source directory (auto-detected if omitted)')
    .option('-p, --port <port>', 'Port to serve the editor on', '4300')
    .action(async (options) => {
        console.log('🌐 Launching translation editor...');
        console.log(`   i18n dir: ${options.input ?? '(auto-detect)'}`);
        console.log(`   Port:     ${options.port}`);
        console.log('');
        console.log('⚠️  Not yet implemented — will serve a built-in Angular app that reads your i18n files');
        // TODO: auto-discover i18n folder from angular.json or convention
        // TODO: serve the built editor app on the specified port
        // TODO: open the browser automatically
    });

program.parse();
```

### File: `packages/core/src/index.ts`

- Size: 515 bytes
- Modified: 2026-03-05 03:11:02 UTC

```typescript
// angular-translation-service — Public API

// Core service
export { TranslationService } from './translation.service';

// Provider function
export { provideTranslation } from './provide-translation';
export type { TranslationConfig } from './types';

// Pipe
export { TranslatePipe } from './translate.pipe';

// Proxy utility
export { createRecursiveProxy } from './recursive-proxy';

// Loader utilities
export { httpLoader, importLoader } from './loader';
export type { TranslationLoader } from './loader';
```

### File: `packages/ssr/src/index.ts`

- Size: 179 bytes
- Modified: 2026-03-05 03:13:37 UTC

```typescript
// angular-translation-service/ssr — Public API

export { provideTranslationSSR } from './provide-translation-ssr';
export { TranslationTransferState } from './transfer-state';
```

### File: `packages/cli/bin/ats.ts`

- Size: 40 bytes
- Modified: 2026-03-05 03:14:15 UTC

```typescript
#!/usr/bin/env bun
import './index.js';
```

### File: `packages/cli/src/commands/check.ts`

- Size: 1055 bytes
- Modified: 2026-03-05 03:14:55 UTC

```typescript
/**
 * ats check — Find missing, unused, and deprecated translation keys
 *
 * Will be ported from: duo-fusion-next/scripts/check-translations.ts (886 lines)
 */

interface CheckOptions {
    locale: string;
    namespace?: string;
    skipUnusedCheck?: boolean;
}

export async function checkTranslations(options: CheckOptions): Promise<void> {
    console.log('🔍 Checking translations...');
    console.log(`   Locale:    ${options.locale}`);
    console.log(`   Namespace: ${options.namespace ?? 'all'}`);
    console.log('');
    console.log('⚠️  Not yet implemented — will be ported from AfterPic check-translations.ts');

    // TODO: Port from duo-fusion-next/scripts/check-translations.ts
    // Key features to port:
    // - Source code scanning (TS + HTML files) for translation key usage
    // - Missing key detection (keys used in code but not in JSON)
    // - Unused key detection (keys in JSON but not referenced in code)
    // - Deprecated pattern detection (translate.bind, t() helper)
    // - Namespace-scoped filtering
}
```

### File: `packages/cli/src/commands/clean.ts`

- Size: 860 bytes
- Modified: 2026-03-05 03:15:08 UTC

```typescript
/**
 * ats clean — Remove orphaned keys from translation files
 *
 * Will be ported from: duo-fusion-next/scripts/remove-orphaned-keys.ts (103 lines)
 */

interface CleanOptions {
    input: string;
    dryRun?: boolean;
}

export async function cleanOrphans(options: CleanOptions): Promise<void> {
    console.log('🧹 Cleaning orphaned keys...');
    console.log(`   Input:   ${options.input}`);
    console.log(`   Dry run: ${options.dryRun ? 'yes' : 'no'}`);
    console.log('');
    console.log('⚠️  Not yet implemented — will be ported from AfterPic remove-orphaned-keys.ts');

    // TODO: Port from duo-fusion-next/scripts/remove-orphaned-keys.ts
    // Key features to port:
    // - Recursive key removal from nested JSON objects
    // - Dry run mode (show what would be removed)
    // - Preserve JSON formatting
    // - Summary report
}
```

### File: `packages/cli/src/commands/generate-types.spec.ts`

- Size: 4143 bytes
- Modified: 2026-03-05 03:33:11 UTC

```typescript
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
```

### File: `packages/cli/src/commands/generate-types.ts`

- Size: 4225 bytes
- Modified: 2026-03-05 03:14:51 UTC

```typescript
/**
 * ats generate — Generate TypeScript interfaces from JSON translation files
 *
 * Ported from: duo-fusion-next/scripts/generate-i18n-types.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';

interface GenerateOptions {
    input: string;
    output: string;
    check?: boolean;
}

export async function generateTypes(options: GenerateOptions): Promise<void> {
    const inputDir = resolve(options.input);
    const outputFile = resolve(options.output);

    if (!existsSync(inputDir)) {
        console.error(`❌ Input directory not found: ${inputDir}`);
        process.exit(1);
    }

    console.log('🔄 Generating i18n types...');
    console.log(`   Input:  ${inputDir}`);
    console.log(`   Output: ${outputFile}`);

    const files = readdirSync(inputDir).filter((f) => f.endsWith('.json'));

    if (files.length === 0) {
        console.error(`❌ No JSON files found in ${inputDir}`);
        process.exit(1);
    }

    const namespaces: string[] = [];
    const typeDefinitions: string[] = [];
    const flatKeyDefinitions: string[] = [];

    for (const file of files) {
        const namespace = basename(file, '.json');
        namespaces.push(namespace);

        const content = JSON.parse(readFileSync(join(inputDir, file), 'utf-8'));
        const typeDef = generateTypeDefinition(content);
        const flatKeys = collectFlatKeys(content, namespace);

        const nsKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(namespace)
            ? namespace
            : `'${namespace}'`;

        typeDefinitions.push(`  ${nsKey}: ${typeDef};`);

        const keyLiterals = flatKeys.map((k) => `'${k}'`).join(' | ') || 'never';
        flatKeyDefinitions.push(`  ${nsKey}: ${keyLiterals};`);
    }

    const output = `// Auto-generated by angular-translation-service CLI
// Do not edit manually. Run: bunx ats generate

export const I18N_NAMESPACES = [
${namespaces.map((n) => `  '${n}',`).join('\n')}
] as const;

export type I18nNamespace = typeof I18N_NAMESPACES[number];

export interface I18nTypes {
${typeDefinitions.join('\n')}
}

export interface I18nKeys {
${flatKeyDefinitions.join('\n')}
}

export type TranslationKey = I18nKeys[keyof I18nKeys];
`;

    if (options.check) {
        // CI mode: assert file is in sync
        if (!existsSync(outputFile)) {
            console.error('❌ Generated types file does not exist. Run: bunx ats generate');
            process.exit(1);
        }
        const existing = readFileSync(outputFile, 'utf-8');
        if (existing !== output) {
            console.error('❌ Generated types are out of sync with JSON source. Run: bunx ats generate');
            process.exit(1);
        }
        console.log('✅ Types are in sync.');
        return;
    }

    writeFileSync(outputFile, output);
    console.log(`✅ Generated ${outputFile}`);
    console.log(`   ${namespaces.length} namespaces found.`);
}

function collectFlatKeys(obj: unknown, prefix: string): string[] {
    if (typeof obj !== 'object' || obj === null) return [];
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = `${prefix}:${key}`;
        if (typeof value === 'string') {
            keys.push(fullKey);
        } else if (typeof value === 'object' && value !== null) {
            keys.push(...collectFlatKeys(value, `${prefix}:${key}`).map((k) =>
                k.replace(`${prefix}:${key}:`, `${prefix}:${key}.`),
            ));
        }
    }
    return keys;
}

function generateTypeDefinition(obj: unknown, indent = 4): string {
    if (typeof obj !== 'object' || obj === null) return 'string';

    const lines: string[] = [];
    const spaces = ' '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
        const propName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
            ? key
            : `'${key}'`;

        if (typeof value === 'string') {
            lines.push(`${spaces}${propName}: string;`);
        } else {
            lines.push(`${spaces}${propName}: ${generateTypeDefinition(value, indent + 2)};`);
        }
    }

    return `{\n${lines.join('\n')}\n${' '.repeat(indent - 2)}}`;
}
```

### File: `packages/cli/src/commands/translate.ts`

- Size: 1254 bytes
- Modified: 2026-03-05 03:15:07 UTC

```typescript
/**
 * ats translate — LLM batch translation via Ollama
 *
 * Will be ported from: duo-fusion-next/scripts/check-translations.ts
 * (proposeBatchTranslations + proposeTranslation functions)
 */

interface TranslateOptions {
    locale: string;
    namespace?: string;
    model: string;
    host: string;
    autoAccept?: boolean;
}

export async function translateKeys(options: TranslateOptions): Promise<void> {
    console.log('🌍 LLM Translation...');
    console.log(`   Locale:  ${options.locale}`);
    console.log(`   Model:   ${options.model}`);
    console.log(`   Host:    ${options.host}`);
    console.log(`   Accept:  ${options.autoAccept ? 'auto' : 'interactive'}`);
    console.log('');
    console.log('⚠️  Not yet implemented — will be ported from AfterPic LLM translation system');

    // TODO: Port from duo-fusion-next/scripts/check-translations.ts
    // Key features to port:
    // - Ollama API client (api/generate endpoint)
    // - Batch translation with chunking (35 entries max)
    // - Namespace context injection (English + target existing translations)
    // - Interactive accept/reject prompts
    // - Auto-accept mode
    // - Code-fenced JSON response parsing
    // - Per-key fallback when batch fails
}
```

### File: `packages/cli/src/commands/validate.ts`

- Size: 805 bytes
- Modified: 2026-03-05 03:15:02 UTC

```typescript
/**
 * ats validate — Detect duplicate keys, values, and structural issues
 *
 * Will be ported from: duo-fusion-next/scripts/validate-translations.ts (284 lines)
 */

interface ValidateOptions {
    input: string;
}

export async function validateTranslations(options: ValidateOptions): Promise<void> {
    console.log('📋 Validating translations...');
    console.log(`   Input: ${options.input}`);
    console.log('');
    console.log('⚠️  Not yet implemented — will be ported from AfterPic validate-translations.ts');

    // TODO: Port from duo-fusion-next/scripts/validate-translations.ts
    // Key features to port:
    // - Duplicate key name detection across sections
    // - Duplicate value detection (redundancy)
    // - Orphaned key finder
    // - Structural validation report
}
```

### File: `packages/core/ng-package.json`

- Size: 184 bytes
- Modified: 2026-03-05 03:10:56 UTC

```json
{
  "$schema": "https://raw.githubusercontent.com/ng-packagr/ng-packagr/main/src/ng-package.schema.json",
  "dest": "../../dist/core",
  "lib": {
    "entryFile": "src/index.ts"
  }
}
```

### File: `packages/core/src/language-detection.spec.ts`

- Size: 3161 bytes
- Modified: 2026-03-05 03:27:35 UTC

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { detectLanguage } from './language-detection';

describe('detectLanguage', () => {
    // ── localStorage detection ────────────────────────────────────────

    it('should return stored language from localStorage', () => {
        const originalLocalStorage = globalThis.localStorage;
        const store: Record<string, string> = { 'app-lang': 'pt-BR' };
        (globalThis as any).localStorage = {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, val: string) => { store[key] = val; },
        };

        const result = detectLanguage(
            ['en', 'pt-BR', 'es'],
            'en',
            { storageKey: 'app-lang' },
        );
        expect(result).toBe('pt-BR');

        (globalThis as any).localStorage = originalLocalStorage;
    });

    it('should skip localStorage if stored language is not supported', () => {
        const store: Record<string, string> = { 'app-lang': 'fr' };
        (globalThis as any).localStorage = {
            getItem: (key: string) => store[key] ?? null,
        };

        const result = detectLanguage(
            ['en', 'pt-BR'],
            'en',
            { storageKey: 'app-lang' },
        );
        expect(result).toBe('en'); // falls through to default

        delete (globalThis as any).localStorage;
    });

    // ── Browser language detection ────────────────────────────────────

    it('should detect exact match from navigator.language', () => {
        const origNav = globalThis.navigator;
        Object.defineProperty(globalThis, 'navigator', {
            value: { language: 'pt-BR', languages: ['pt-BR', 'en'] },
            writable: true,
            configurable: true,
        });

        const result = detectLanguage(['en', 'pt-BR', 'es'], 'en');
        expect(result).toBe('pt-BR');

        Object.defineProperty(globalThis, 'navigator', {
            value: origNav,
            writable: true,
            configurable: true,
        });
    });

    it('should match base language when exact is not supported', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: { language: 'pt', languages: ['pt'] },
            writable: true,
            configurable: true,
        });

        const result = detectLanguage(['en', 'pt-BR', 'es'], 'en');
        expect(result).toBe('pt-BR'); // pt matches pt-BR

        Object.defineProperty(globalThis, 'navigator', {
            value: undefined,
            writable: true,
            configurable: true,
        });
    });

    // ── Default fallback ──────────────────────────────────────────────

    it('should return default language when nothing matches', () => {
        // No localStorage, no navigator
        const result = detectLanguage(['en', 'pt-BR'], 'en');
        expect(result).toBe('en');
    });
});
```

### File: `packages/core/src/language-detection.ts`

- Size: 1717 bytes
- Modified: 2026-03-05 03:28:33 UTC

```typescript
/**
 * Detects the user's preferred language from available sources.
 *
 * Detection chain (first match wins):
 * 1. Cookie (if key provided)
 * 2. localStorage (if key provided)
 * 3. navigator.language / navigator.languages
 * 4. Default language
 */
export function detectLanguage(
    supportedLangs: string[],
    defaultLang: string,
    options?: { cookieKey?: string; storageKey?: string },
): string {
    // 1. Cookie
    if (options?.cookieKey && typeof document !== 'undefined') {
        const match = document.cookie.match(
            new RegExp(`(?:^|;\\s*)${options.cookieKey}=([^;]*)`),
        );
        if (match?.[1] && supportedLangs.includes(match[1])) {
            return match[1];
        }
    }

    // 2. localStorage
    if (options?.storageKey && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(options.storageKey);
        if (stored && supportedLangs.includes(stored)) {
            return stored;
        }
    }

    // 3. Browser detection
    if (typeof navigator !== 'undefined' && navigator.language) {
        const languages = navigator.languages ?? [navigator.language];
        for (const browserLang of languages) {
            if (!browserLang) continue;
            // Exact match
            if (supportedLangs.includes(browserLang)) {
                return browserLang;
            }
            // Base language match (e.g., 'pt' from 'pt-BR')
            const baseLang = browserLang.split('-')[0];
            const match = supportedLangs.find(
                (l) => l === baseLang || l.startsWith(baseLang + '-'),
            );
            if (match) return match;
        }
    }

    // 4. Default
    return defaultLang;
}
```

### File: `packages/core/src/loader.spec.ts`

- Size: 2559 bytes
- Modified: 2026-03-05 03:27:34 UTC

```typescript
import { describe, it, expect, mock } from 'bun:test';
import { httpLoader, importLoader } from './loader';

describe('httpLoader', () => {
    it('should construct the correct URL from basePath, lang, and namespace', async () => {
        const mockFetch = mock(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ title: 'Hello' }),
            } as Response),
        );
        globalThis.fetch = mockFetch as any;

        const loader = httpLoader('/assets/i18n');
        await loader('en', 'common');

        expect(mockFetch).toHaveBeenCalledWith('/assets/i18n/en/common.json');
    });

    it('should return parsed JSON data', async () => {
        const data = { nav: { home: 'Home', about: 'About' } };
        globalThis.fetch = mock(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(data),
            } as Response),
        ) as any;

        const loader = httpLoader('/i18n');
        const result = await loader('pt-BR', 'common');

        expect(result).toEqual(data);
    });

    it('should throw on non-OK response', async () => {
        globalThis.fetch = mock(() =>
            Promise.resolve({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            } as Response),
        ) as any;

        const loader = httpLoader('/assets/i18n');
        expect(loader('en', 'missing')).rejects.toThrow('Failed to load');
    });
});

describe('importLoader', () => {
    it('should call the factory with lang and namespace', async () => {
        const factory = mock(() =>
            Promise.resolve({ default: { greeting: 'Olá' } }),
        );

        const loader = importLoader(factory as any);
        await loader('pt-BR', 'common');

        expect(factory).toHaveBeenCalledWith('pt-BR', 'common');
    });

    it('should extract default export', async () => {
        const data = { title: 'Hello' };
        const factory = mock(() => Promise.resolve({ default: data }));

        const loader = importLoader(factory as any);
        const result = await loader('en', 'app');

        expect(result).toEqual(data);
    });

    it('should fall back to module itself when no default export', async () => {
        const data = { title: 'Hello' };
        const factory = mock(() => Promise.resolve(data));

        const loader = importLoader(factory as any);
        const result = await loader('en', 'app');

        expect(result).toEqual(data);
    });
});
```

### File: `packages/core/src/loader.ts`

- Size: 1412 bytes
- Modified: 2026-03-05 03:11:46 UTC

```typescript
import { TranslationLoader } from './types';

/**
 * Creates a fetch-based translation loader.
 *
 * Loads JSON files from: `${basePath}/${lang}/${namespace}.json`
 *
 * @example
 * provideTranslation({
 *   loader: httpLoader('/assets/i18n'),
 * })
 */
export function httpLoader(basePath: string): TranslationLoader {
    return async (lang: string, namespace: string) => {
        const url = `${basePath}/${lang}/${namespace}.json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `[angular-translation-service] Failed to load ${url}: ${response.status} ${response.statusText}`,
            );
        }

        return response.json();
    };
}

/**
 * Creates an import-based translation loader using dynamic imports.
 *
 * The factory callback must be provided by the consuming app so the bundler
 * can statically analyze the import paths at build time.
 *
 * @example
 * provideTranslation({
 *   loader: importLoader((lang, ns) => import(`./assets/i18n/${lang}/${ns}.json`)),
 * })
 */
export function importLoader(
    factory: (lang: string, namespace: string) => Promise<{ default: Record<string, unknown> }>,
): TranslationLoader {
    return async (lang: string, namespace: string) => {
        const module = await factory(lang, namespace);
        return module.default ?? module;
    };
}

export type { TranslationLoader };
```

### File: `packages/core/src/provide-translation.ts`

- Size: 1054 bytes
- Modified: 2026-03-05 03:13:04 UTC

```typescript
import {
    EnvironmentProviders,
    makeEnvironmentProviders,
    provideAppInitializer,
    inject,
} from '@angular/core';
import { TranslationConfig, TRANSLATION_CONFIG } from './types';
import { TranslationService } from './translation.service';

/**
 * Provides the translation system for an Angular application.
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideTranslation({
 *       defaultLang: 'en',
 *       supportedLangs: ['en', 'pt-BR'],
 *       coreNamespaces: ['common'],
 *       loader: httpLoader('/assets/i18n'),
 *     }),
 *   ],
 * };
 */
export function provideTranslation(
    config: TranslationConfig,
): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: TRANSLATION_CONFIG, useValue: config },
        // Preload core namespaces before app renders
        provideAppInitializer(() => {
            const i18n = inject(TranslationService);
            return i18n.ensureNamespaces(config.coreNamespaces);
        }),
    ]);
}
```

### File: `packages/core/src/recursive-proxy.spec.ts`

- Size: 8576 bytes
- Modified: 2026-03-05 03:26:53 UTC

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { createRecursiveProxy, clearProxyCache } from './recursive-proxy';

describe('createRecursiveProxy', () => {
    beforeEach(() => {
        clearProxyCache();
    });

    // ── Basic Property Access ─────────────────────────────────────────

    it('should return a proxy for any property access', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.nav).toBeDefined();
        expect(proxy.nav.title).toBeDefined();
        expect(proxy.deeply.nested.path.value).toBeDefined();
    });

    it('should never throw on deep access', () => {
        const proxy = createRecursiveProxy();
        expect(() => proxy.a.b.c.d.e.f.g.h).not.toThrow();
    });

    // ── Memoization (referential stability) ───────────────────────────

    it('should return the same proxy instance for the same path (memoization)', () => {
        const proxy = createRecursiveProxy();
        const first = proxy.nav.title;
        const second = proxy.nav.title;
        expect(first).toBe(second); // Referential equality — prevents NG0100
    });

    it('should return different proxies for different paths', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.nav.title).not.toBe(proxy.nav.subtitle);
    });

    it('should memoize across separate root proxy calls', () => {
        const a = createRecursiveProxy('test');
        const b = createRecursiveProxy('test');
        expect(a).toBe(b); // Same path = same instance
    });

    // ── String Coercion (template interpolation) ──────────────────────

    it('should return empty string for Symbol.toPrimitive on root', () => {
        const proxy = createRecursiveProxy();
        const result = `${proxy}`;
        expect(result).toBe('');
    });

    it('should return path string for Symbol.toPrimitive on nested', () => {
        const proxy = createRecursiveProxy('nav.title');
        const result = `${proxy}`;
        expect(result).toBe('nav.title');
    });

    it('should return empty string from toString on root proxy', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.toString()).toBe('');
    });

    it('should return path from toString on named proxy', () => {
        const proxy = createRecursiveProxy('common');
        expect(proxy.toString()).toBe('common');
    });

    // ── JSON Serialization Safety ─────────────────────────────────────

    it('should not crash JSON.stringify', () => {
        const proxy = createRecursiveProxy();
        expect(() => JSON.stringify(proxy)).not.toThrow();
    });

    it('should return {} from toJSON', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.toJSON()).toEqual({});
    });

    // ── Promise Detection Prevention ──────────────────────────────────

    it('should return undefined for "then" (prevents Promise detection)', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.then).toBeUndefined();
    });

    it('should return undefined for "catch"', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.catch).toBeUndefined();
    });

    it('should return undefined for "finally"', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.finally).toBeUndefined();
    });

    // ── Symbol.iterator (@for loop safety) ────────────────────────────

    it('should yield nothing from Symbol.iterator', () => {
        const proxy = createRecursiveProxy();
        const items = [...proxy];
        expect(items).toEqual([]);
    });

    it('should be safe in for...of loops', () => {
        const proxy = createRecursiveProxy();
        const items: unknown[] = [];
        for (const item of proxy) {
            items.push(item);
        }
        expect(items).toEqual([]);
    });

    // ── Angular Internal Properties ───────────────────────────────────

    it('should return undefined for __ngContext__', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.__ngContext__).toBeUndefined();
    });

    it('should return undefined for Angular lifecycle hooks', () => {
        const proxy = createRecursiveProxy();
        expect(proxy.ngOnInit).toBeUndefined();
        expect(proxy.ngOnDestroy).toBeUndefined();
        expect(proxy.ngOnChanges).toBeUndefined();
        expect(proxy.ngDoCheck).toBeUndefined();
        expect(proxy.ngAfterContentInit).toBeUndefined();
        expect(proxy.ngAfterContentChecked).toBeUndefined();
        expect(proxy.ngAfterViewInit).toBeUndefined();
        expect(proxy.ngAfterViewChecked).toBeUndefined();
    });

    // ── String Prototype Method Delegation ────────────────────────────

    it('should delegate String methods to path string', () => {
        const proxy = createRecursiveProxy('hello');
        expect(proxy.toUpperCase()).toBe('HELLO');
        expect(proxy.includes('ell')).toBe(true);
        expect(proxy.startsWith('hel')).toBe(true);
        expect(proxy.length).toBe(5);
    });

    // ── Depth Cap (Deep Think v2) ─────────────────────────────────────

    it('should return a frozen empty object beyond MAX_PROXY_DEPTH (15)', () => {
        const proxy = createRecursiveProxy();
        // Build a path with exactly 15 segments (hits the depth cap)
        let current: any = proxy;
        for (let i = 0; i < 15; i++) {
            current = current[`level${i}`];
        }
        // At depth 15, createRecursiveProxy returns a frozen empty object
        expect(Object.isFrozen(current)).toBe(true);
        expect(Object.keys(current)).toEqual([]);
        // Accessing beyond the frozen object returns undefined (normal JS)
        expect(current.anything).toBeUndefined();
    });

    it('should still work at exactly MAX_PROXY_DEPTH - 1', () => {
        const proxy = createRecursiveProxy();
        let current: any = proxy;
        for (let i = 0; i < 14; i++) {
            current = current[`l${i}`];
        }
        // At depth 14 (below cap), should still be a functional proxy
        expect(`${current}`).not.toBe('[object Object]');
    });

    // ── Symbol Properties (DevTools safety) ───────────────────────────

    it('should return undefined for arbitrary symbols', () => {
        const proxy = createRecursiveProxy();
        const sym = Symbol('test');
        expect(proxy[sym]).toBeUndefined();
    });

    it('should return "TranslationProxy" for Symbol.toStringTag', () => {
        const proxy = createRecursiveProxy();
        expect(proxy[Symbol.toStringTag]).toBe('TranslationProxy');
    });

    // ── Truthiness ────────────────────────────────────────────────────

    it('should be truthy (proxies are always truthy in JS)', () => {
        const proxy = createRecursiveProxy();
        expect(!!proxy).toBe(true);
        // This is the Truthiness Trap — proxies can't be falsy.
        // The library solves this at the Signal level (Signal<T | undefined>).
    });

    // ── has trap ──────────────────────────────────────────────────────

    it('should return true for "in" operator checks', () => {
        const proxy = createRecursiveProxy();
        expect('anything' in proxy).toBe(true);
    });

    // ── Cache clearing ────────────────────────────────────────────────

    it('should clear cache and return new instances after clearProxyCache', () => {
        const a = createRecursiveProxy('test');
        clearProxyCache();
        const b = createRecursiveProxy('test');
        expect(a).not.toBe(b); // Different instances after cache clear
    });
});
```

### File: `packages/core/src/recursive-proxy.ts`

- Size: 4280 bytes
- Modified: 2026-03-05 03:17:57 UTC

```typescript
/**
 * Creates a recursive proxy that safely intercepts all property access.
 *
 * Used to prevent template crashes when translation namespaces are still loading.
 * The proxy returns nested proxies for any accessed property, ensuring expressions
 * like `t().nav.title` never throw, even when the underlying data is undefined.
 *
 * Design decisions (from Deep Think review):
 * - Memoizes nested paths for referential stability (prevents NG0100)
 * - Traps toJSON, then/catch, Symbol.iterator, Symbol.toPrimitive, Angular internals
 * - Returns '' for string coercion, {} for JSON serialization
 */

/** Cache of proxy instances by path to ensure referential equality */
const PROXY_CACHE = new Map<string, any>();

/**
 * Maximum proxy nesting depth. Beyond this, returns a frozen empty object.
 * Prevents infinite traversal from DevTools, logging libs, or deep-cloners.
 * (Deep Think v2 recommendation)
 */
const MAX_PROXY_DEPTH = 15;

/** Properties that Angular's internals probe — must return undefined */
const ANGULAR_INTERNALS = new Set([
    '__ngContext__',
    '__ngSimpleChanges__',
    'ngOnInit',
    'ngOnDestroy',
    'ngOnChanges',
    'ngDoCheck',
    'ngAfterContentInit',
    'ngAfterContentChecked',
    'ngAfterViewInit',
    'ngAfterViewChecked',
]);

export function createRecursiveProxy(path: string = ''): any {
    if (PROXY_CACHE.has(path)) {
        return PROXY_CACHE.get(path)!;
    }

    // Depth cap — prevents infinite traversal (Deep Think v2)
    const depth = path ? path.split('.').length : 0;
    if (depth >= MAX_PROXY_DEPTH) {
        const frozen = Object.freeze({});
        PROXY_CACHE.set(path, frozen);
        return frozen;
    }

    const proxy = new Proxy(Object.create(null), {
        get(_target: any, prop: string | symbol): any {
            // String coercion — return the path or empty string
            if (prop === Symbol.toPrimitive || prop === 'valueOf') {
                return () => path || '';
            }

            if (prop === Symbol.toStringTag) {
                return 'TranslationProxy';
            }

            // toString — return path for template interpolation
            if (prop === 'toString') {
                return () => path || '';
            }

            // JSON serialization — prevent crash
            if (prop === 'toJSON') {
                return () => ({});
            }

            // Promise detection — prevent async unwrapping
            if (prop === 'then' || prop === 'catch' || prop === 'finally') {
                return undefined;
            }

            // Iterator — yield nothing (safe for @for loops)
            if (prop === Symbol.iterator) {
                return function* () { };
            }

            // Angular lifecycle internals — must return undefined
            if (typeof prop === 'string' && ANGULAR_INTERNALS.has(prop)) {
                return undefined;
            }

            // String prototype methods — delegate to the path string
            if (typeof prop === 'string' && prop in String.prototype) {
                const pathStr = path || '';
                const method = (pathStr as any)[prop];
                if (typeof method === 'function') {
                    return method.bind(pathStr);
                }
                return method;
            }

            // Skip symbol properties (DevTools iteration safety)
            if (typeof prop === 'symbol') {
                return undefined;
            }

            // Recursive: return another memoized proxy for the nested path
            const childPath = path ? `${path}.${prop}` : prop;
            return createRecursiveProxy(childPath);
        },

        has(_target: any, _prop: string | symbol): boolean {
            return true;
        },

        ownKeys(): string[] {
            return [];
        },

        getOwnPropertyDescriptor(): PropertyDescriptor | undefined {
            return {
                configurable: true,
                enumerable: false,
                value: undefined,
            };
        },
    });

    PROXY_CACHE.set(path, proxy);
    return proxy;
}

/**
 * Clears the proxy cache. Useful for testing.
 */
export function clearProxyCache(): void {
    PROXY_CACHE.clear();
}
```

### File: `packages/core/src/translate.pipe.ts`

- Size: 638 bytes
- Modified: 2026-03-05 03:12:57 UTC

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Translation pipe for template usage.
 *
 * Uses the colon namespace separator: 'common:nav.title'
 *
 * @example
 * {{ 'common:nav.title' | translate }}
 * {{ 'common:greeting' | translate:{ name: 'Igor' } }}
 */
@Pipe({
    name: 'translate',
    pure: false,
})
export class TranslatePipe implements PipeTransform {
    private readonly i18n = inject(TranslationService);

    transform(key: string, params?: Record<string, string | number>): string {
        return this.i18n.instant(key, params);
    }
}
```

### File: `packages/core/src/translation.service.spec.ts`

- Size: 16537 bytes
- Modified: 2026-03-05 03:32:09 UTC

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TranslationService } from './translation.service';
import type { TranslationConfig } from './types';

/**
 * Creates a mock loader that returns pre-configured dictionaries.
 */
function createMockLoader(data: Record<string, Record<string, Record<string, unknown>>>) {
    return mock((lang: string, namespace: string) => {
        const langData = data[lang];
        if (!langData || !langData[namespace]) {
            return Promise.reject(new Error(`No data for ${lang}/${namespace}`));
        }
        return Promise.resolve(structuredClone(langData[namespace]));
    });
}

function createService(
    overrides: Partial<TranslationConfig> & { loader: TranslationConfig['loader'] },
    ssrLang?: string,
): TranslationService {
    const config: TranslationConfig = {
        defaultLang: 'en',
        supportedLangs: ['en', 'pt-BR', 'es'],
        coreNamespaces: ['common'],
        namespaceSeparator: ':',
        detectLanguage: false,
        ...overrides,
    };
    return TranslationService.create(config, ssrLang);
}

describe('TranslationService', () => {
    // ── Language Initialization ───────────────────────────────────────

    describe('language initialization', () => {
        it('should default to defaultLang', () => {
            const loader = createMockLoader({ en: { common: { title: 'Hi' } } });
            const service = createService({ loader });
            expect(service.lang()).toBe('en');
        });

        it('should use SSR language when provided', () => {
            const loader = createMockLoader({ 'pt-BR': { common: { title: 'Oi' } } });
            const service = createService({ loader }, 'pt-BR');
            expect(service.lang()).toBe('pt-BR');
        });
    });

    // ── ensureNamespaces ──────────────────────────────────────────────

    describe('ensureNamespaces', () => {
        it('should load a namespace via the loader', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);
            expect(loader).toHaveBeenCalledWith('en', 'common');
        });

        it('should deduplicate concurrent loads for the same namespace', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });

            const p1 = service.ensureNamespaces(['common']);
            const p2 = service.ensureNamespaces(['common']);
            await Promise.all([p1, p2]);

            expect(loader).toHaveBeenCalledTimes(1);
        });

        it('should not reload already-loaded namespaces', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });

            await service.ensureNamespaces(['common']);
            await service.ensureNamespaces(['common']);

            expect(loader).toHaveBeenCalledTimes(1);
        });
    });

    // ── translate() ───────────────────────────────────────────────────

    describe('translate()', () => {
        it('should return a signal resolving to the translated string', async () => {
            const loader = createMockLoader({ en: { common: { greeting: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:greeting');
            expect(sig()).toBe('Hello');
        });

        it('should return the key itself when namespace is not loaded', () => {
            const loader = createMockLoader({});
            const service = createService({ loader });

            const sig = service.translate('missing:key.path');
            expect(sig()).toBe('missing:key.path');
        });

        it('should resolve nested dotted paths', async () => {
            const loader = createMockLoader({
                en: { common: { nav: { home: 'Home', about: 'About' } } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.translate('common:nav.home')()).toBe('Home');
            expect(service.translate('common:nav.about')()).toBe('About');
        });

        it('should cache base key signals', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig1 = service.translate('common:title');
            const sig2 = service.translate('common:title');
            expect(sig1).toBe(sig2);
        });

        it('should interpolate params using {{ }} syntax', async () => {
            const loader = createMockLoader({
                en: { common: { greeting: 'Hello, {{name}}!' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:greeting', { name: 'Igor' });
            expect(sig()).toBe('Hello, Igor!');
        });

        it('should interpolate params using { } syntax', async () => {
            const loader = createMockLoader({
                en: { common: { greeting: 'Hello, {name}!' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:greeting', { name: 'Igor' });
            expect(sig()).toBe('Hello, Igor!');
        });

        it('should return uncached signal for parameterized calls (memory leak prevention)', async () => {
            const loader = createMockLoader({
                en: { common: { greeting: 'Hello, {name}!' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig1 = service.translate('common:greeting', { name: 'A' });
            const sig2 = service.translate('common:greeting', { name: 'B' });
            expect(sig1).not.toBe(sig2);
        });

        it('should auto-trigger namespace loading from key prefix', async () => {
            const loader = createMockLoader({
                en: { settings: { theme: 'Dark' } },
            });
            const service = createService({ loader, coreNamespaces: [] });

            const sig = service.translate('settings:theme');

            // Wait for the async load to complete
            await new Promise((r) => setTimeout(r, 20));
            expect(sig()).toBe('Dark');
        });
    });

    // ── instant() ─────────────────────────────────────────────────────

    describe('instant()', () => {
        it('should return the translation string synchronously', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello World' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:title')).toBe('Hello World');
        });

        it('should return the key when not found', () => {
            const loader = createMockLoader({});
            const service = createService({ loader });

            expect(service.instant('missing:key')).toBe('missing:key');
        });

        it('should interpolate params', async () => {
            const loader = createMockLoader({
                en: { common: { count: '{n} items' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:count', { n: 42 })).toBe('42 items');
        });
    });

    // ── select() ──────────────────────────────────────────────────────

    describe('select()', () => {
        it('should return undefined before namespace loads (Truthiness Trap fix)', () => {
            const loader = createMockLoader({});
            const service = createService({ loader, coreNamespaces: [] });

            const scope = service.select('unloaded');
            expect(scope()).toBeUndefined();
        });

        it('should return data after namespace loads', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const scope = service.select('common');
            expect(scope()).toBeDefined();
            expect((scope() as any).title).toBe('Hello');
        });

        it('should return proxy-wrapped data for safe deep access', async () => {
            const loader = createMockLoader({
                en: { common: { nav: { home: 'Home' } } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const scope = service.select('common');
            const data = scope()!;
            expect((data as any).nav.home).toBe('Home');
        });

        it('should return safe proxy for missing keys', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const scope = service.select('common');
            const data = scope()!;
            expect(() => (data as any).nonexistent.deeply.nested).not.toThrow();
        });

        it('should cache select() signals for same namespace', () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });

            const a = service.select('common');
            const b = service.select('common');
            expect(a).toBe(b);
        });
    });

    // ── setLang() ─────────────────────────────────────────────────────

    describe('setLang()', () => {
        it('should switch the language signal', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
                'pt-BR': { common: { title: 'Olá' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            expect(service.lang()).toBe('en');
            await service.setLang('pt-BR');
            expect(service.lang()).toBe('pt-BR');
        });

        it('should reload cached namespaces for new language', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
                'pt-BR': { common: { title: 'Olá' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            await service.setLang('pt-BR');

            expect(loader).toHaveBeenCalledWith('pt-BR', 'common');
        });

        it('should update translate() signals after lang switch', async () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
                'pt-BR': { common: { title: 'Olá' } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);

            const sig = service.translate('common:title');
            expect(sig()).toBe('Hello');

            await service.setLang('pt-BR');
            expect(sig()).toBe('Olá');
        });

        it('should warn and skip unsupported languages', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            const warnSpy = mock(() => { });
            console.warn = warnSpy;

            await service.setLang('fr');

            expect(service.lang()).toBe('en');
            expect(warnSpy).toHaveBeenCalled();
        });
    });

    // ── ready signal ──────────────────────────────────────────────────

    describe('ready signal', () => {
        it('should be false before core namespaces load', () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            expect(service.ready()).toBe(false);
        });

        it('should be true after all core namespaces load', async () => {
            const loader = createMockLoader({ en: { common: { title: 'Hello' } } });
            const service = createService({ loader });
            await service.ensureNamespaces(['common']);
            expect(service.ready()).toBe(true);
        });
    });

    // ── Fallback Language Chains ──────────────────────────────────────

    describe('fallback chains', () => {
        it('should deep-merge fallback translations', async () => {
            const loader = createMockLoader({
                en: { common: { nav: { home: 'Home', about: 'About', contact: 'Contact' } } },
                'pt-BR': { common: { nav: { home: 'Início' } } },
            });
            const service = createService({
                loader,
                defaultLang: 'pt-BR',
                fallbackChain: { 'pt-BR': ['en'] },
                coreNamespaces: ['common'],
            });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:nav.home')).toBe('Início');
            expect(service.instant('common:nav.about')).toBe('About');
            expect(service.instant('common:nav.contact')).toBe('Contact');
        });

        it('should handle deeply nested fallback merging', async () => {
            const loader = createMockLoader({
                en: { common: { settings: { theme: { dark: 'Dark', light: 'Light' } } } },
                es: { common: { settings: { theme: { dark: 'Oscuro' } } } },
                'es-AR': { common: {} },
            });
            const service = createService({
                loader,
                defaultLang: 'es-AR',
                supportedLangs: ['en', 'es', 'es-AR'],
                fallbackChain: { 'es-AR': ['es', 'en'] },
                coreNamespaces: ['common'],
            });
            await service.ensureNamespaces(['common']);

            expect(service.instant('common:settings.theme.dark')).toBe('Oscuro');
            expect(service.instant('common:settings.theme.light')).toBe('Light');
        });
    });

    // ── Colon Separator ───────────────────────────────────────────────

    describe('colon separator', () => {
        it('should parse namespace:key.path correctly', async () => {
            const loader = createMockLoader({
                en: { app: { errors: { not_found: 'Not found' } } },
            });
            const service = createService({ loader });
            await service.ensureNamespaces(['app']);

            expect(service.instant('app:errors.not_found')).toBe('Not found');
        });

        it('should return full key when no separator found', () => {
            const loader = createMockLoader({
                en: { common: { title: 'Hello' } },
            });
            const service = createService({ loader });

            expect(service.instant('no_namespace')).toBe('no_namespace');
        });
    });
});
```

### File: `packages/core/src/translation.service.ts`

- Size: 14957 bytes
- Modified: 2026-03-05 03:31:13 UTC

```typescript
import {
    Injectable,
    Signal,
    computed,
    signal,
    inject,
    type WritableSignal,
} from '@angular/core';
import { TRANSLATION_CONFIG, CURRENT_LANGUAGE, type TranslationConfig } from './types';
import { createRecursiveProxy } from './recursive-proxy';

/**
 * Core translation service providing reactive i18n for Angular applications.
 *
 * API surface:
 * - select(scope)   → Signal<T | undefined> — scope proxy for template access
 * - translate(key)  → Signal<string>         — single key signal (cached)
 * - instant(key)    → string                 — imperative, non-reactive
 * - setLang(lang)   → Promise<void>          — switch language at runtime
 * - ensureNamespaces(ns[]) → Promise<void>   — pre-load namespaces
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
    private readonly config: TranslationConfig;

    /** Separator between namespace and key path (default ':') */
    private readonly sep: string;

    /** Current language signal */
    readonly lang: WritableSignal<string>;

    /** Flat namespace dictionaries: lang -> namespace -> data */
    private readonly dictionaries = new Map<string, Map<string, Record<string, unknown>>>();

    /** Loading promises dedup: namespace -> Promise */
    private readonly loadingPromises = new Map<string, Promise<void>>();

    /** Version counter — bumped on every dict change to trigger reactivity */
    private readonly version: WritableSignal<number> = signal(0);

    /** Whether core namespaces have been loaded */
    readonly ready: Signal<boolean>;

    /** Signal cache for translate() — keyed by base key only */
    private readonly signalCache = new Map<string, Signal<string>>();

    /** Signal cache for select() — keyed by namespace */
    private readonly scopeCache = new Map<string, Signal<any>>();

    /**
     * Angular DI constructor.
     * For testing, use TranslationService.create() instead.
     */
    constructor() {
        this.config = inject(TRANSLATION_CONFIG);
        const ssrLang = inject(CURRENT_LANGUAGE, { optional: true });
        this.sep = this.config.namespaceSeparator ?? ':';
        this.lang = signal(this._resolveInitialLang(ssrLang ?? undefined));
        this.ready = computed(() => {
            this.version();
            const currentLang = this.lang();
            const langDict = this.dictionaries.get(currentLang);
            if (!langDict) return false;
            return this.config.coreNamespaces.every((ns) => langDict.has(ns));
        });
    }

    /**
     * Creates a TranslationService instance without Angular DI.
     * Used for unit testing.
     */
    static create(config: TranslationConfig, ssrLang?: string): TranslationService {
        const instance = Object.create(TranslationService.prototype) as TranslationService;

        // Initialize private fields manually
        (instance as any).config = config;
        (instance as any).sep = config.namespaceSeparator ?? ':';
        (instance as any).dictionaries = new Map<string, Map<string, Record<string, unknown>>>();
        (instance as any).loadingPromises = new Map<string, Promise<void>>();
        (instance as any).version = signal(0);
        (instance as any).signalCache = new Map<string, Signal<string>>();
        (instance as any).scopeCache = new Map<string, Signal<any>>();
        (instance as any).lang = signal(instance._resolveInitialLang(ssrLang));
        (instance as any).ready = computed(() => {
            (instance as any).version();
            const currentLang = instance.lang();
            const langDict = (instance as any).dictionaries.get(currentLang);
            if (!langDict) return false;
            return config.coreNamespaces.every((ns: string) => langDict.has(ns));
        });

        return instance;
    }

    /**
     * Returns a scope signal for template access.
     *
     * - Core namespaces (preloaded): never undefined
     * - Lazy namespaces: undefined until loaded, then proxy-wrapped data
     *
     * @example
     * protected common = this.i18n.select('common');
     * // template: @let t = common(); {{ t.nav.title }}
     */
    select<K extends string>(scope: K): Signal<Record<string, unknown> | undefined> {
        if (this.scopeCache.has(scope)) {
            return this.scopeCache.get(scope)!;
        }

        // Trigger loading if not yet loaded
        this.ensureNamespaces([scope]);

        const scopeSignal = computed(() => {
            this.version(); // subscribe to dict changes
            const currentLang = this.lang();
            const langDict = this.dictionaries.get(currentLang);
            const data = langDict?.get(scope);

            if (!data) {
                // Not loaded yet — return undefined (falsy, solves Truthiness Trap)
                return undefined;
            }

            // Wrap in proxy for safe deep access
            return this.wrapWithProxy(data, scope);
        });

        this.scopeCache.set(scope, scopeSignal);
        return scopeSignal;
    }

    /**
     * Returns a signal for a single translation key.
     * Base key signal is cached; parameterized calls return uncached computed.
     *
     * Key format: 'namespace:dotted.path' (e.g., 'common:nav.title')
     */
    translate(
        key: string,
        params?: Record<string, string | number>,
    ): Signal<string> {
        // If parameterized, return uncached computed to prevent memory leaks
        if (params) {
            const baseSignal = this.getOrCreateBaseSignal(key);
            return computed(() => this.interpolate(baseSignal(), params));
        }

        return this.getOrCreateBaseSignal(key);
    }

    /**
     * Returns the translation string synchronously (non-reactive).
     * Use for imperative code like toasts, logging, etc.
     */
    instant(key: string, params?: Record<string, string | number>): string {
        const value = this.resolveKey(key);
        return params ? this.interpolate(value, params) : value;
    }

    /**
     * Switch language at runtime. Reloads all cached namespaces.
     */
    async setLang(lang: string): Promise<void> {
        if (!this.config.supportedLangs.includes(lang)) {
            console.warn(
                `[angular-translation-service] Language "${lang}" is not in supportedLangs`,
            );
            return;
        }

        // Load all currently cached namespaces for the new language
        const namespacesToLoad = this.getLoadedNamespaces();
        await this.loadNamespaces(lang, namespacesToLoad);

        // Persist preference
        if (this.config.storageKey && typeof localStorage !== 'undefined') {
            localStorage.setItem(this.config.storageKey, lang);
        }

        this.lang.set(lang);
    }

    /**
     * Pre-load additional namespaces. Auto-deduplicates concurrent loads.
     */
    async ensureNamespaces(namespaces: string[]): Promise<void> {
        const currentLang = this.lang();
        const missing = namespaces.filter((ns) => {
            const langDict = this.dictionaries.get(currentLang);
            return !langDict?.has(ns);
        });

        if (missing.length === 0) return;

        await this.loadNamespaces(currentLang, missing);
    }

    // ── Private Methods ──────────────────────────────────────────────

    private _resolveInitialLang(ssrLang?: string): string {
        // 1. SSR token
        if (ssrLang) return ssrLang;

        // 2. Persisted preference
        if (this.config.storageKey && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored && this.config.supportedLangs.includes(stored)) {
                return stored;
            }
        }

        // 3. Browser detection
        if (this.config.detectLanguage && typeof navigator !== 'undefined' && navigator.language) {
            const browserLang = navigator.language;
            if (this.config.supportedLangs.includes(browserLang)) {
                return browserLang;
            }
            // Try base language (e.g., 'pt' from 'pt-BR')
            const baseLang = browserLang.split('-')[0];
            const match = this.config.supportedLangs.find(
                (l) => l === baseLang || l.startsWith(baseLang + '-'),
            );
            if (match) return match;
        }

        // 4. Default
        return this.config.defaultLang;
    }

    private async loadNamespaces(
        lang: string,
        namespaces: string[],
    ): Promise<void> {
        const promises = namespaces.map((ns) => this.loadSingleNamespace(lang, ns));
        await Promise.all(promises);
    }

    private async loadSingleNamespace(
        lang: string,
        namespace: string,
    ): Promise<void> {
        const dedupKey = `${lang}:${namespace}`;

        // Dedup concurrent loads
        if (this.loadingPromises.has(dedupKey)) {
            return this.loadingPromises.get(dedupKey)!;
        }

        const loadPromise = this.doLoad(lang, namespace, dedupKey);
        this.loadingPromises.set(dedupKey, loadPromise);
        return loadPromise;
    }

    private async doLoad(
        lang: string,
        namespace: string,
        dedupKey: string,
    ): Promise<void> {
        try {
            // Build fallback chain: [lang, ...fallbacks]
            const chain = [lang, ...(this.config.fallbackChain?.[lang] ?? [])];
            const uniqueChain = [...new Set(chain)];

            // Fetch all in parallel
            const results = await Promise.allSettled(
                uniqueChain.map((l) => this.config.loader(l, namespace)),
            );

            // Deep merge: fallback first, then more specific locale overwrites
            let merged: Record<string, unknown> = {};
            for (let i = results.length - 1; i >= 0; i--) {
                const result = results[i];
                if (result.status === 'fulfilled') {
                    merged = this.deepMerge(merged, result.value);
                }
            }

            // Store
            if (!this.dictionaries.has(lang)) {
                this.dictionaries.set(lang, new Map());
            }
            this.dictionaries.get(lang)!.set(namespace, merged);

            // Bump version to notify all computed signals
            this.version.update((v) => v + 1);
        } catch (err) {
            console.error(
                `[angular-translation-service] Failed to load ${lang}/${namespace}:`,
                err,
            );
        } finally {
            this.loadingPromises.delete(dedupKey);
        }
    }

    private getOrCreateBaseSignal(key: string): Signal<string> {
        if (this.signalCache.has(key)) {
            return this.signalCache.get(key)!;
        }

        // Auto-trigger namespace loading
        const namespace = key.split(this.sep)[0];
        if (namespace) {
            this.ensureNamespaces([namespace]);
        }

        const sig = computed(() => this.resolveKey(key));
        this.signalCache.set(key, sig);
        return sig;
    }

    private resolveKey(key: string): string {
        this.version(); // subscribe to dict changes
        const currentLang = this.lang();

        const sepIndex = key.indexOf(this.sep);
        if (sepIndex === -1) return key; // no namespace separator found

        const namespace = key.substring(0, sepIndex);
        const path = key.substring(sepIndex + 1);

        const langDict = this.dictionaries.get(currentLang);
        const nsData = langDict?.get(namespace);
        if (!nsData) return key; // namespace not loaded yet

        // Resolve dotted path
        const segments = path.split('.');
        let current: unknown = nsData;
        for (const segment of segments) {
            if (current == null || typeof current !== 'object') return key;
            current = (current as Record<string, unknown>)[segment];
        }

        return typeof current === 'string' ? current : key;
    }

    private interpolate(
        text: string,
        params: Record<string, string | number>,
    ): string {
        return text.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (_, key) => {
            return params[key]?.toString() ?? `{${key}}`;
        });
    }

    private wrapWithProxy(
        data: Record<string, unknown>,
        _scope: string,
    ): Record<string, unknown> {
        // Return a proxy that resolves real data for existing keys
        // and falls back to the recursive proxy for missing keys
        return new Proxy(data, {
            get(target, prop: string | symbol): unknown {
                if (typeof prop === 'symbol') {
                    if (prop === Symbol.toPrimitive) return () => '';
                    if (prop === Symbol.iterator) return function* () { };
                    if (prop === Symbol.toStringTag) return 'TranslationScope';
                    return undefined;
                }

                const value = target[prop];

                if (value === undefined) {
                    // Key not in dictionary — return safe proxy
                    return createRecursiveProxy(prop);
                }

                if (typeof value === 'object' && value !== null) {
                    // Nested object — wrap recursively
                    return new Proxy(value as Record<string, unknown>, this);
                }

                // Leaf value (string, number, etc.)
                return value;
            },

            has(_target, _prop) {
                return true;
            },
        });
    }

    private getLoadedNamespaces(): string[] {
        const currentLang = this.lang();
        const langDict = this.dictionaries.get(currentLang);
        return langDict ? [...langDict.keys()] : [];
    }

    /**
     * Recursively deep-merges two translation dictionaries.
     * Source values overwrite target values at leaf level.
     * Nested objects are merged recursively (not replaced).
     */
    private deepMerge(
        target: Record<string, unknown>,
        source: Record<string, unknown>,
    ): Record<string, unknown> {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            const sourceVal = source[key];
            const targetVal = result[key];

            if (
                typeof sourceVal === 'object' && sourceVal !== null && !Array.isArray(sourceVal) &&
                typeof targetVal === 'object' && targetVal !== null && !Array.isArray(targetVal)
            ) {
                result[key] = this.deepMerge(
                    targetVal as Record<string, unknown>,
                    sourceVal as Record<string, unknown>,
                );
            } else {
                result[key] = sourceVal;
            }
        }

        return result;
    }
}
```

### File: `packages/core/src/types.ts`

- Size: 1401 bytes
- Modified: 2026-03-05 03:11:28 UTC

```typescript
import { InjectionToken } from '@angular/core';

/**
 * Configuration for provideTranslation().
 */
export interface TranslationConfig {
    /** Default language code (e.g., 'en') */
    defaultLang: string;

    /** All supported language codes */
    supportedLangs: string[];

    /** Fallback chain for regional locales (e.g., { 'es-AR': ['es', 'en'] }) */
    fallbackChain?: Record<string, string[]>;

    /** Namespaces preloaded before app renders (via APP_INITIALIZER) */
    coreNamespaces: string[];

    /** Namespace separator character (default: ':') */
    namespaceSeparator?: string;

    /** Translation loader function */
    loader: TranslationLoader;

    /** localStorage key for persisting language preference */
    storageKey?: string;

    /** Whether to auto-detect language from browser/cookie */
    detectLanguage?: boolean;
}

/**
 * Loader function signature.
 * Given a language and namespace, returns the translation dictionary.
 */
export type TranslationLoader = (
    lang: string,
    namespace: string,
) => Promise<Record<string, unknown>>;

/**
 * InjectionToken for the translation config.
 */
export const TRANSLATION_CONFIG = new InjectionToken<TranslationConfig>(
    'TRANSLATION_CONFIG',
);

/**
 * InjectionToken for SSR language detection (provided by server).
 */
export const CURRENT_LANGUAGE = new InjectionToken<string>(
    'CURRENT_LANGUAGE',
);
```

### File: `packages/core/tsconfig.lib.json`

- Size: 225 bytes
- Modified: 2026-03-05 03:11:00 UTC

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/lib",
    "declaration": true,
    "declarationMap": true,
    "inlineSources": true,
    "types": []
  },
  "exclude": ["**/*.spec.ts"]
}
```

### File: `packages/ssr/ng-package.json`

- Size: 183 bytes
- Modified: 2026-03-05 03:13:26 UTC

```json
{
  "$schema": "https://raw.githubusercontent.com/ng-packagr/ng-packagr/main/src/ng-package.schema.json",
  "dest": "../../dist/ssr",
  "lib": {
    "entryFile": "src/index.ts"
  }
}
```

### File: `packages/ssr/src/provide-translation-ssr.ts`

- Size: 1307 bytes
- Modified: 2026-03-05 03:13:44 UTC

```typescript
import {
    EnvironmentProviders,
    makeEnvironmentProviders,
} from '@angular/core';
import { CURRENT_LANGUAGE } from 'angular-translation-service';

export interface TranslationSSRConfig {
    /** Extract language from the incoming HTTP request */
    langFromRequest: (req: unknown) => string;
}

/**
 * Provides SSR-specific translation support.
 *
 * Adds:
 * - CURRENT_LANGUAGE token from request headers
 * - TransferState snapshot/hydration
 * - PendingTasks integration
 *
 * @example
 * // server.ts
 * const serverConfig: ApplicationConfig = {
 *   providers: [
 *     provideTranslationSSR({
 *       langFromRequest: (req) => detectFromHeaders(req),
 *     }),
 *   ],
 * };
 */
export function provideTranslationSSR(
    config: TranslationSSRConfig,
): EnvironmentProviders {
    return makeEnvironmentProviders([
        {
            provide: CURRENT_LANGUAGE,
            useFactory: () => {
                // In SSR context, the request object needs to be injected
                // This is a placeholder — actual implementation will use
                // Angular's REQUEST token from @angular/ssr
                return config.langFromRequest(null);
            },
        },
        // TODO: TranslationTransferState provider
        // TODO: PendingTasks integration
    ]);
}
```

### File: `packages/ssr/src/transfer-state.ts`

- Size: 843 bytes
- Modified: 2026-03-05 03:13:45 UTC

```typescript
import { Injectable } from '@angular/core';

/**
 * Manages TransferState serialization/hydration for translations.
 *
 * Server: Snapshots all loaded namespaces into TransferState before render.
 * Client: Hydrates dictionaries synchronously from TransferState on bootstrap.
 *
 * Design decision (Deep Think #3): Serializes ALL namespaces loaded during
 * the SSR lifecycle — not just coreNamespaces — to prevent hydration mismatch
 * on lazy-loaded routes.
 */
@Injectable({ providedIn: 'root' })
export class TranslationTransferState {
    // TODO: Implement
    // - Server: hook into TranslationService to snapshot dictionaries
    // - Client: hydrate from TransferState key before first render
    // - Track request-scoped Set<string> of loaded namespaces
    // - Add PendingTasks timeout (1.5s configurable) for server safety
}
```

### File: `packages/ssr/tsconfig.lib.json`

- Size: 225 bytes
- Modified: 2026-03-05 03:13:29 UTC

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/lib",
    "declaration": true,
    "declarationMap": true,
    "inlineSources": true,
    "types": []
  },
  "exclude": ["**/*.spec.ts"]
}
```
