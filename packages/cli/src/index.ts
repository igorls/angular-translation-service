#!/usr/bin/env node
/**
 * angular-translation-service CLI
 *
 * Usage:
 *   npx ats generate    # Generate TS types from JSON
 *   npx ats check       # Find missing/unused keys
 *   npx ats validate    # Detect duplicates/orphans
 *   npx ats translate   # LLM batch translation via Ollama
 *   npx ats clean       # Remove orphaned keys
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

program
    .name('ats')
    .description('CLI tooling for angular-translation-service')
    .version(pkg.version);

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
    .option('--default-lang <lang>', 'Reference language (overrides alphabetical detection)')
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
    .option('--default-lang <lang>', 'Source language (overrides alphabetical detection)')
    .action(async (options) => {
        const { translateKeys } = await import('./commands/translate');
        await translateKeys(options);
    });

program
    .command('clean')
    .description('Remove orphaned keys from translation files')
    .option('-i, --input <dir>', 'i18n source directory', 'src/assets/i18n')
    .option('--dry-run', 'Show what would be removed without removing')
    .option('--default-lang <lang>', 'Reference language (overrides alphabetical detection)')
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
    .option('-p, --port <port>', 'Port to serve the editor on', '4800')
    .action(async (options) => {
        const { startEditor } = await import('./commands/editor');
        await startEditor(options);
    });

program
    .command('mcp')
    .description('Start MCP server for agent-controlled translation automation')
    .option('-i, --input <dir>', 'i18n source directory (auto-detected if omitted)')
    .option('-s, --src <dir>', 'Source code directory for scanning', 'src')
    .option('--provider <provider>', 'LLM provider: ollama | openai | gemini', 'ollama')
    .option('--model <model>', 'LLM model name', 'qwen3.5:9b')
    .option('--host <host>', 'Ollama host', 'localhost:11434')
    .option('--base-url <url>', 'OpenAI-compatible base URL', 'https://api.openai.com')
    .option('--api-key <key>', 'API key for OpenAI/Gemini')
    .action(async (options) => {
        const { startMCPServer } = await import('./commands/mcp');
        await startMCPServer(options);
    });

program.parse();
