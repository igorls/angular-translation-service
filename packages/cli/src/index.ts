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
    .description('Find missing and unused translation keys by scanning source code')
    .option('--i18n <dir>', 'i18n source directory for default language', 'src/i18n/en')
    .option('--src <dir>', 'Source directory to scan for key usage', 'src')
    .option('--namespace <ns>', 'Limit to specific namespace')
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
    .command('scan')
    .description('Scan HTML templates for hardcoded strings that should be translated')
    .option('--src <dir>', 'Source directory to scan', 'src')
    .option('--extensions <ext>', 'Comma-separated file extensions to scan', '.html')
    .option('--min-score <n>', 'Minimum heuristic score to report', '2')
    .option('--verify', 'Use LLM to verify candidates (requires Ollama)')
    .option('--model <model>', 'Ollama model for verification', 'gemma3:12b')
    .option('--host <host>', 'Ollama host', '127.0.0.1:11434')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
        const { scanTemplates } = await import('./commands/scan');
        await scanTemplates(options);
    });

program
    .command('editor')
    .description('Launch the translation editor in your browser')
    .option('-i, --input <dir>', 'i18n source directory (auto-detected if omitted)')
    .option('-s, --src <dir>', 'Source code directory for usage scanning', 'src')
    .option('-p, --port <port>', 'Port to serve the editor on', '4500')
    .action(async (options) => {
        const { startEditor } = await import('./commands/editor-server');
        await startEditor(options);
    });

program.parse();
