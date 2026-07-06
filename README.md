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

The `select()` API returns a signal that resolves to a recursive proxy. The proxy safely returns empty strings for missing keys, so you can reference nested translation paths **without conditional guards**:

```typescript
import { TranslationService } from '@angular-translation-service/core';

@Component({
  template: `
    @let t = common();
    <h1>{{ t?.nav?.home }}</h1>
    <p>{{ t?.greeting }}</p>
  `,
})
export class MyComponent {
  private readonly i18n = inject(TranslationService);
  protected readonly common = this.i18n.select('common');
}
```

> **Avoid wrapping translated content in `@if (t)` blocks.** This causes layout shift (CLS) because the entire DOM structure is hidden until translations load, then everything appears at once. Use optional chaining (`t?.key`) instead — the proxy handles missing keys gracefully.

### 3. Reactivity: `translate()` vs `instant()`

Use `translate()` or `select()` for UI state that should update after `setLang()`. `instant()` is a synchronous snapshot for imperative code and does not create reactive dependencies:

```typescript
// Rebuilds when the namespace loads and when the language changes
protected readonly densityOptions = computed(() => [
  { value: 'compact', label: this.i18n.translate('settings:density.compact')() },
  { value: 'comfortable', label: this.i18n.translate('settings:density.comfortable')() },
]);
```

If `instant()` is called before a lazy namespace has ever been requested, dev mode warns once and starts loading that namespace. The current synchronous call still returns `''`, so call `ensureNamespaces()` first when imperative text must be ready.

### 4. Typed Keys (Optional)

Run `ats generate` to register your generated key union and namespace schemas with the core API:

```bash
npx ats generate -i src/i18n/en -o src/app/i18n.generated.ts
```

When that file is included in your TypeScript program, `translate()`, `instant()`, and `select()` narrow from permissive strings to generated types. Apps that skip generation keep the flexible string API.

### 5. Interpolation

Use single braces as the canonical placeholder form in JSON values:

```json
{ "greeting": "Hello, {name}!" }
```

Double braces such as `{{name}}` remain supported for compatibility. In Angular templates, leave a space between pipe params and Angular's closing braces:

```html
{{ 'common:greeting' | translate:{ name: userName() } }}
```

### 6. SSR Support

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

### 7. Choosing a Loader (SSG vs SSR)

The library ships two loaders. The right choice depends on your rendering strategy:

| Loader | Best For | How It Works |
|--------|----------|-------------|
| `httpLoader(basePath)` | **SSR** (live server) | Fetches JSON via `fetch()` at runtime. Requires an HTTP server to resolve URLs. |
| `importLoader(factory)` | **SSG** (static prerender) | Uses dynamic `import()` to load JSON from the filesystem. Works during Node prerender without a server. |

#### SSG with `importLoader`

If your app uses `outputMode: 'static'` / `RenderMode.Prerender`, use `importLoader` to ensure translations are available during the build-time prerender:

```typescript
import { provideTranslation, importLoader } from '@angular-translation-service/core';

provideTranslation({
  defaultLang: 'en',
  supportedLangs: ['en', 'pt-BR'],
  coreNamespaces: ['common'],
  loader: importLoader((lang, ns) => import(`./i18n/${lang}/${ns}.json`)),
});
```

> **Why?** During SSG, there is no HTTP server running — `httpLoader` fetches fail silently and translations are not embedded in the prerendered HTML. This causes severe layout shift (CLS > 0.5) when the client loads and translations pop in.
>
> **Trade-off:** `importLoader` bundles all referenced locale files into the JS output. This is ideal for small-to-medium sites. For apps with many large locale files, use `httpLoader` with SSR instead.

### 8. Loading States with `ready`

The `TranslationService` exposes a `ready` signal that becomes `true` once all `coreNamespaces` have loaded for the current language. Use it to prevent flash of untranslated content (FOUC) on heavier sites:

```typescript
@Component({
  template: `
    @if (!i18n.ready()) {
      <div class="loading-screen">
        <div class="spinner"></div>
      </div>
    } @else {
      @let t = common();
      <h1>{{ t?.nav?.home }}</h1>
    }
  `,
})
export class AppShell {
  protected readonly i18n = inject(TranslationService);
  protected readonly common = this.i18n.select('common');
}
```

This pattern is useful when:
- Your app has many core namespaces that load asynchronously
- You want a branded loading screen instead of empty content
- You're using `httpLoader` where fetch latency is noticeable

> **Note:** With `importLoader`, translations resolve synchronously during SSG, so `ready()` is `true` from the first render and the loading screen never appears in prerendered HTML.

### 9. CLI Tools

```bash
npx ats generate    # Generate TypeScript types from JSON
npx ats check       # Check source references, locale parity, and empty values
npx ats validate    # Detect structural issues
npx ats translate   # Auto-translate with LLM
npx ats editor      # Launch visual editor
```

> The core and CLI packages are currently versioned independently. Install the latest compatible `@angular-translation-service/cli` alongside `@angular-translation-service/core`; release notes call out any required pairing.

## Documentation

Full documentation: [angular-translation-service.pages.dev](https://igorls.github.io/angular-translation-service/)

## License

MIT © [Igor LS](https://github.com/igorls)

