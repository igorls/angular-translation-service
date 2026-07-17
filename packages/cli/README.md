# @angular-translation-service/cli

CLI tooling for managing, validating, and auto-translating your i18n JSON files.

## Install

```bash
# As a dev dependency (recommended)
npm install -D @angular-translation-service/cli

# Then run with npx
npx ats --help

# Or install globally
npm install -g @angular-translation-service/cli
ats --help
```

## Canonical paths

Commands expect this layout by default:

```
src/i18n/
├── en/
│   ├── common.json
│   └── home.json
└── pt-BR/
    ├── common.json
    └── home.json
```

| Command | Default path |
|---------|----------------|
| `generate` | `src/i18n/en` |
| `check` | `src/i18n/en` (also accepts root `src/i18n`) |
| `validate` / `clean` / `translate` | `src/i18n` |
| `editor` / `mcp` | auto-discovered (`angular.json`, then `src/i18n`, `src/assets/i18n`, `i18n`) |

Only **editor** and **mcp** auto-discover. Pass `-i` / `--i18n` for other locations.

## Commands

| Command | Description |
|---------|-------------|
| `ats generate` | Generate TypeScript types from JSON translation files |
| `ats check` | Scan source references, dynamic prefixes, parity drift, empty values, and unused keys |
| `ats validate` | Detect structural issues across languages (missing keys, empty values) |
| `ats translate` | Auto-translate missing keys using LLM via Ollama |
| `ats clean` | Remove orphaned keys from target language files |
| `ats scan` | Scan HTML templates for hardcoded strings that should be translated |
| `ats editor` | Launch the visual translation editor in your browser |
| `ats mcp` | Start an MCP server for agent-controlled translation workflows |

## Examples

```bash
# Generate TypeScript types
npx ats generate -i src/i18n/en -o src/app/i18n.generated.ts

# Check source references across every locale
npx ats check --i18n src/i18n --src src

# Validate all languages (set --default-lang so the reference is not alphabetical)
npx ats validate -i src/i18n --default-lang en

# Auto-translate with Ollama (requires a running Ollama host)
npx ats translate -i src/i18n --locale pt-BR --default-lang en --model gemma3:12b

# Scan templates for hardcoded UI strings
npx ats scan --src src --min-score 3 --json

# Launch the editor (default port 4800)
npx ats editor -p 4800

# MCP server for agents
npx ats mcp --provider ollama --model qwen3.5:9b
```

### `ats translate` options

| Option | Default | Description |
|--------|---------|-------------|
| `-i, --input <dir>` | `src/i18n` | Root i18n directory |
| `--locale <locale>` | `pt-BR` | Target language |
| `--default-lang <lang>` | alphabetical first | Source language |
| `--namespace <ns>` | — | Limit to one namespace |
| `--model <model>` | `gemma3:12b` | Ollama model |
| `--host <host>` | `127.0.0.1:11434` | Ollama host |
| `--auto-accept` | — | Skip interactive prompts |

## Generated Types

`ats generate` keeps the existing exported namespace/key types and also augments `@angular-translation-service/core`:

```typescript
declare module '@angular-translation-service/core' {
  interface TranslationKeyRegistry {
    keys: I18nTranslationKey;
    namespaces: I18nTypes;
  }
}
```

Once the generated file is included in your app, `translate()`, `instant()`, and `select()` are checked against your JSON packs. Without generated types, the core API remains permissive.

## Source Checks

`ats check` accepts either a single locale directory such as `src/i18n/en` or a root i18n directory such as `src/i18n`. When multiple locale packs are available, it validates every quoted `ns:key.path` source reference against every locale, checks dynamic prefix references like `admin:orders.status.`, reports cross-locale parity drift in both directions, and fails empty string values.

The first source file reference is included in missing-key output so CI failures point straight to the typo or missing translation.

> **Note:** Quoted strings that look like keys (docs samples, meta tags, `document:click`) can produce false positives. Point `--src` at application code for CI when possible.

## CI Integration

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npm ci
- run: npx ats generate -i src/i18n/en -o src/app/i18n.generated.ts --check
- run: npx ats validate -i src/i18n --default-lang en
- run: npx ats check --i18n src/i18n --src src
```

## Versioning

`@angular-translation-service/core` and `@angular-translation-service/cli` are currently versioned independently. Use the latest compatible CLI with your core package unless a release note calls out a required pairing.

## Documentation

Full docs: [igorls.github.io/angular-translation-service](https://igorls.github.io/angular-translation-service/)

Guides (troubleshooting, Ollama setup, version matrix): […/guides](https://igorls.github.io/angular-translation-service/guides)

## License

MIT
