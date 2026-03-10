# @angular-translation-service/core

Signal-based Angular i18n library with runtime language switching and SSR hydration.

## Features

- **Signal-first API** — `translate()`, `select()`, and `instant()` powered by Angular signals
- **Lazy namespace loading** — Load translations on-demand per route/component
- **Crash-proof templates** — Recursive proxy prevents errors while namespaces load
- **SSR/SSG hydration** — Zero-config `TransferState` integration via `/ssr` entry point
- **`TranslatePipe`** — Drop-in pipe for template usage
- **Zoneless support** — Works with Angular's zoneless change detection

## Quick Start

```bash
npm install @angular-translation-service/core
```

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

## SSR

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

## Documentation

Full docs: [angular-translation-service.pages.dev](https://igorls.github.io/angular-translation-service/)

## License

MIT
