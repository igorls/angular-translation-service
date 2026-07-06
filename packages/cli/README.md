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

## Commands

| Command | Description |
|---------|-------------|
| `ats generate` | Generate TypeScript types from JSON translation files |
| `ats check` | Find missing and unused translation keys by scanning source code |
| `ats validate` | Detect structural issues across languages (missing keys, empty values) |
| `ats translate` | Auto-translate missing keys using LLM via Ollama |
| `ats clean` | Remove orphaned keys from target language files |
| `ats scan` | Scan HTML templates for hardcoded strings that should be translated |
| `ats editor` | Launch the visual translation editor in your browser |

## Examples

```bash
# Generate TypeScript types
npx ats generate -i src/i18n -o src/i18n.generated.ts

# Check for missing/unused keys
npx ats check --i18n src/i18n/en --src src

# Validate all languages
npx ats validate -i src/i18n

# Auto-translate with Ollama
npx ats translate -i src/i18n --from en --to pt-BR --model llama3.1

# Launch the editor
npx ats editor
```

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

## CI Integration

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npm ci
- run: npx ats generate --check
- run: npx ats validate -i src/i18n
- run: npx ats check --i18n src/i18n/en --src src
```

## Versioning

`@angular-translation-service/core` and `@angular-translation-service/cli` are currently versioned independently. Use the latest compatible CLI with your core package unless a release note calls out a required pairing.

## Documentation

Full docs: [angular-translation-service.pages.dev](https://igorls.github.io/angular-translation-service/)

## License

MIT
