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
| `ats check` | Scan source references, dynamic prefixes, parity drift, empty values, and unused keys |
| `ats validate` | Detect structural issues across languages (missing keys, empty values) |
| `ats translate` | Auto-translate missing keys using LLM via Ollama |
| `ats clean` | Remove orphaned keys from target language files |
| `ats scan` | Scan HTML templates for hardcoded strings that should be translated |
| `ats editor` | Launch the visual translation editor in your browser |

## Examples

```bash
# Generate TypeScript types
npx ats generate -i src/i18n -o src/i18n.generated.ts

# Check source references across every locale
npx ats check --i18n src/i18n --src src

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

## Source Checks

`ats check` accepts either a single locale directory such as `src/i18n/en` or a root i18n directory such as `src/i18n`. When multiple locale packs are available, it validates every quoted `ns:key.path` source reference against every locale, checks dynamic prefix references like `admin:orders.status.`, reports cross-locale parity drift in both directions, and fails empty string values.

The first source file reference is included in missing-key output so CI failures point straight to the typo or missing translation.

## CI Integration

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npm ci
- run: npx ats generate --check
- run: npx ats validate -i src/i18n
- run: npx ats check --i18n src/i18n --src src
```

## Versioning

`@angular-translation-service/core` and `@angular-translation-service/cli` are currently versioned independently. Use the latest compatible CLI with your core package unless a release note calls out a required pairing.

## Documentation

Full docs: [angular-translation-service.pages.dev](https://igorls.github.io/angular-translation-service/)

## License

MIT
