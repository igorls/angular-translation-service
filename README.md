# Angular Translation Service

Signal-based Angular i18n library with runtime language switching, SSR hydration, and LLM-powered CLI tooling.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [@angular-translation-service/core](./packages/core) | [![npm](https://img.shields.io/npm/v/@angular-translation-service/core)](https://www.npmjs.com/package/@angular-translation-service/core) | Signal-based i18n library for Angular |
| [@angular-translation-service/cli](./packages/cli) | [![npm](https://img.shields.io/npm/v/@angular-translation-service/cli)](https://www.npmjs.com/package/@angular-translation-service/cli) | CLI for type generation, validation, and LLM translation |

## Quick Start

```bash
npm install @angular-translation-service/core
npm install -D @angular-translation-service/cli
```

### 1. Configure

```typescript
import { provideTranslation, httpLoader } from '@angular-translation-service/core';

export const appConfig = {
  providers: [
    provideTranslation({
      defaultLang: 'en',
      supportedLangs: ['en', 'pt-BR'],
      coreNamespaces: ['common'],
      loader: httpLoader('/i18n'),
    }),
  ],
};
```

### 2. Use in Templates

```typescript
import { TranslationService } from '@angular-translation-service/core';

@Component({
  template: `
    @let t = common();
    @if (t) {
      <h1>{{ t.nav.home }}</h1>
    }
  `,
})
export class MyComponent {
  private readonly i18n = inject(TranslationService);
  protected readonly common = this.i18n.select('common');
}
```

### 3. SSR Support

```typescript
// app.config.server.ts
import { provideTranslationSSR } from '@angular-translation-service/core/ssr';

const serverConfig = {
  providers: [
    provideTranslationSSR({
      resolveLanguage: (req) => req.headers['accept-language']?.split(',')[0] ?? 'en',
    }),
  ],
};
```

### 4. CLI Tools

```bash
npx ats generate    # Generate TypeScript types from JSON
npx ats check       # Find missing/unused keys
npx ats validate    # Detect structural issues
npx ats translate   # Auto-translate with LLM
npx ats editor      # Launch visual editor
```

## Documentation

Full documentation: [angular-translation-service.pages.dev](https://igorls.github.io/angular-translation-service/)

## License

MIT © [Igor LS](https://github.com/igorls)
