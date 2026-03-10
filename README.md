# angular-translation-service

[![CI](https://github.com/igorls/angular-translation-service/actions/workflows/ci.yml/badge.svg)](https://github.com/igorls/angular-translation-service/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/angular-translation-service)](https://www.npmjs.com/package/angular-translation-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Signal-based Angular i18n library with runtime language switching, SSR hydration, and developer tooling.

## Features

- **Signals-first** — All reactive state via Angular Signals, zero RxJS dependency
- **Runtime language switching** — No page reload, no separate builds
- **Namespace-scoped lazy loading** — Only load what you need, when you need it
- **SSR + Hydration safe** — TransferState integration via `angular-translation-service/ssr`
- **Type-safe** — Auto-generated interfaces from JSON files
- **Crash-proof** — Recursive proxy prevents template errors during loading
- **Tiny** — Zero dependencies beyond `@angular/core`, target < 4kb gzipped
- **CLI tooling** — Type generation, validation, LLM-powered translation

## Installation

```bash
# Core library
bun add angular-translation-service

# SSR support (included in the core package)
# Import from 'angular-translation-service/ssr'

# CLI tooling (optional)
bun add -D @angular-translation-service/cli
```

## Quick Start

### 1. Create translation files

```
src/i18n/
├── en/
│   └── common.json    # { "greeting": "Hello", "nav": { "home": "Home" } }
└── pt-BR/
    └── common.json    # { "greeting": "Olá", "nav": { "home": "Início" } }
```

### 2. Configure the provider

```typescript
// app.config.ts
import { provideTranslation, httpLoader } from 'angular-translation-service';

export const appConfig = {
  providers: [
    provideTranslation({
      defaultLang: 'en',
      supportedLangs: ['en', 'pt-BR'],
      coreNamespaces: ['common'],
      loader: httpLoader({ prefix: '/i18n' }),
    }),
  ],
};
```

### 3. Use in components

```typescript
import { TranslationService, TranslatePipe } from 'angular-translation-service';

@Component({
  template: `
    <h1>{{ i18n.translate('common:greeting')() }}</h1>
    <p>{{ 'common:nav.home' | translate }}</p>
  `,
  imports: [TranslatePipe],
})
export class AppComponent {
  i18n = inject(TranslationService);
}
```

### 4. SSR Support

```typescript
// app.config.server.ts
import { provideTranslationSSR } from 'angular-translation-service/ssr';

const serverConfig = {
  providers: [
    provideTranslationSSR({
      langFromRequest: (req) => {
        const accept = (req as Request).headers.get('accept-language') ?? 'en';
        return accept.split(',')[0].split('-')[0];
      },
    }),
  ],
};
```

## Packages

| Package | npm | Description |
| ------- | --- | ----------- |
| Core + SSR | `angular-translation-service` | Angular runtime library with SSR secondary entry point |
| CLI | `@angular-translation-service/cli` | CLI tooling (type gen, validation, LLM translation) |

## CLI Commands

```bash
bunx ats generate   # Generate TypeScript types from JSON translation files
bunx ats validate   # Validate translation files for missing/extra keys
bunx ats check      # Check code for missing/unused translation keys
bunx ats clean      # Remove orphaned keys from target languages
bunx ats scan       # Scan templates for hardcoded strings
bunx ats translate  # LLM-powered translation
```

## Angular Compatibility

| Version | Angular |
| ------- | ------- |
| 0.x | 19, 20, 21 |

## License

MIT
