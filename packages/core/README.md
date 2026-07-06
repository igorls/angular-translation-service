# @angular-translation-service/core

Signal-based Angular i18n library with runtime language switching and SSR hydration.

## Features

- **Signal-first API** — reactive `translate()`/`select()` plus synchronous `instant()`
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
    <h1>{{ t?.nav?.home }}</h1>
  `,
})
export class MyComponent {
  private readonly i18n = inject(TranslationService);
  protected readonly common = this.i18n.select('common');
}
```

## Reactivity

Use `translate()` and `select()` for UI that must update after language switches. `instant()` is deliberately non-reactive and should be reserved for imperative reads such as logs, confirm prompts, or already-loaded toast messages.

```typescript
protected readonly options = computed(() => [
  { value: 'compact', label: this.i18n.translate('settings:density.compact')() },
  { value: 'comfortable', label: this.i18n.translate('settings:density.comfortable')() },
]);
```

If `instant()` is called for a lazy namespace that has never been requested, dev mode warns once and starts loading that namespace. The current synchronous call still returns `''`; call `ensureNamespaces()` first when imperative text must be available immediately.

## Typed Keys

The runtime API is permissive by default. When `@angular-translation-service/cli` generates an `i18n.generated.ts` file, it augments `TranslationKeyRegistry` so `translate()`, `instant()`, and `select()` become typed from your JSON packs.

```typescript
this.i18n.translate('common:nav.home'); // OK
this.i18n.translate('common:nav.hmoe'); // TypeScript error after ats generate
```

## Interpolation

Use `{param}` as the canonical placeholder form in JSON values. `{{param}}` remains supported for compatibility.

```json
{ "greeting": "Hello, {name}!" }
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
