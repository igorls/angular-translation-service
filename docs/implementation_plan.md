# Implementation Plan: `angular-translation-service`

## Problem Statement

Over 7+ projects (GesPatri, PollsterGraph, CheckZone, AfterPic, Aura Companion), we have built and evolved a runtime, signal-based translation system for Angular. Each iteration solved production problems, but the code is duplicated and fragmented across projects. Beyond the runtime library, we've also accumulated significant tooling: type generators, translation validators, orphan key cleaners, and **LLM-powered batch translation scripts** (via Ollama). This needs to become a unified ecosystem.

## Design Goals

1. **Signals-first** — All reactive state via Angular Signals, zero RxJS dependency
2. **Runtime language switching** — No page reload, no separate builds
3. **Namespace-scoped lazy loading** — Only load what you need, when you need it
4. **SSR + Hydration safe** — TransferState integration, PendingTasks blocking
5. **Type-safe** — Auto-generated interfaces from JSON files
6. **Crash-proof** — Recursive proxy prevents template errors during loading
7. **Tiny** — Zero dependencies beyond `@angular/core`, target < 4kb gzipped
8. **DX-first** — `provideTranslation()` setup, `@let t = common()` template pattern, pipe support

---

## Competitive Analysis

| Feature                  | `@angular/localize` | `ngx-translate` | Transloco                   | `@ngx-runtime-i18n` | `ngx-signal-i18n` | **Ours**      |
| :----------------------- | :------------------ | :-------------- | :-------------------------- | :------------------ | :---------------- | :------------ |
| Runtime switch           | ❌ (rebuild)        | ✅              | ✅                          | ✅                  | ✅                | ✅            |
| Signals-native           | ❌                  | ❌ (Zone.js)    | Partial (`translateSignal`) | ✅                  | ✅ (signal fns)   | ✅            |
| SSR TransferState        | N/A                 | ❌              | ❌                          | ✅                  | ❌                | ✅            |
| Namespace lazy-load      | N/A                 | Manual          | ✅ (via DI scope)           | ✅                  | ❌ (single file)  | ✅            |
| Typed keys               | ❌                  | ❌              | ✅                          | ❌                  | ✅ (TS-first)     | ✅ (auto-gen) |
| `select()` scope signal  | N/A                 | N/A             | ❌                          | ❌                  | ❌                | ✅            |
| Recursive proxy fallback | N/A                 | N/A             | ❌                          | ❌                  | ❌                | ✅            |
| Crash-proof templates    | N/A                 | ❌              | ❌                          | Partial             | ❌                | ✅            |
| ICU / Plurals            | ✅ (full)           | ❌              | ❌                          | Lite                | ❌                | Lite (v2)     |
| Bundle size              | 0 (compile)         | ~15kb           | ~10kb                       | ~3kb                | ~1.5kb            | ~3kb          |
| Zoneless compatible      | ✅                  | ❌              | Partial                     | ✅                  | ✅                | ✅            |
| `@for` safe proxy        | N/A                 | N/A             | N/A                         | N/A                 | N/A               | ✅            |
| JSON translations        | ✅ (XLIFF)          | ✅              | ✅                          | ✅                  | ❌ (TS only)      | ✅            |
| Param interpolation      | ✅                  | ✅              | ✅                          | ✅                  | ✅ (signal fns)   | ✅            |

### `ngx-signal-i18n` (yagcioe) — Notable Approach

This ~1.5kb library takes a **TypeScript-first** approach: translations are TS objects with signal-based interpolation functions (e.g., `(num: Signal<number>) => \`count: ${num()}\``). Type safety comes from TS itself, not JSON. It's clever but impractical for real-world projects because: (1) no JSON files means no translator tooling, (2) no namespace/scope system, (3) no SSR support, (4) no crash-proof proxy, (5) unmaintained.

### Key Differentiators vs Competition

1.  **`select()` returning a proxy signal** — No other library provides this. It enables `@let t = common(); {{ t.nav.home }}` without any pipe or function call per key. The proxy ensures zero crashes during async loading.

2.  **Recursive proxy with Angular/String safety** — Our production-hardened proxy handles Angular lifecycle hooks, Promise-like properties, `Symbol.iterator` for `@for` loops, and String prototype methods. No competitor does this.

3.  **Triple API surface** — `translate()` (Signal), `select()` (Scope Signal), `instant()` (imperative). Covers every use case without forcing one pattern.

4.  **Auto-generated types from JSON** — CLI tool reads your JSON files and emits TypeScript interfaces. `select('common')` returns `Signal<CommonTranslations>`. Neither Transloco nor `@ngx-runtime-i18n` auto-generate types from source JSON.

5.  **Full tooling ecosystem** — No competitor ships CLI tools for translation validation, LLM-powered batch translation, orphan key detection, or a visual translation editor. This is a complete developer workflow, not just a runtime library.

---

## Public API Design

### 1. Provider Function

```typescript
// app.config.ts
import { provideTranslation } from "angular-translation-service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTranslation({
      defaultLang: "en",
      supportedLangs: ["en", "pt-BR", "es"],
      fallbackChain: { "pt-BR": ["pt", "en"], "es-AR": ["es", "en"] }, // regional fallbacks
      coreNamespaces: ["common", "app"], // preloaded before render
      namespaceSeparator: ":", // common:nav.title
      loader: httpLoader("/assets/i18n"), // fetch-based
      // OR: importLoader((lang, scope) => import(`./assets/i18n/${lang}/${scope}.json`))
      storageKey: "app-lang",
      detectLanguage: true,
    }),
  ],
};
```

### 2. TranslationService

```typescript
@Injectable({ providedIn: "root" })
export class TranslationService {
  // Signals
  readonly lang: Signal<SupportedLanguage>;
  readonly ready: Signal<boolean>;

  // Scope selector — returns undefined until loaded, then proxy-wrapped data
  // Core namespaces: never undefined (preloaded via APP_INITIALIZER)
  // Lazy namespaces: undefined → data (natural loading guard)
  select<K extends keyof I18nTypes>(scope: K): Signal<I18nTypes[K] | undefined>;

  // Key translation — cached by base key only, params applied uncached
  // Key format: 'namespace:dotted.path' (e.g., 'common:nav.title')
  translate(
    key: string,
    params?: Record<string, string | number>,
  ): Signal<string>;

  // Imperative (non-reactive, for TS-side logic)
  instant(key: string, params?: Record<string, string | number>): string;

  // Language control — reloads all cached namespaces + fallback chain
  setLang(lang: SupportedLanguage): Promise<void>;

  // Pre-load additional namespaces (auto-triggered by translate/select too)
  ensureNamespaces(namespaces: string[]): Promise<void>;
}
```

### 3. TranslatePipe

```typescript
@Pipe({ name: "translate", pure: false })
export class TranslatePipe implements PipeTransform {
  transform(key: string, params?: Record<string, string>): string;
}
```

### 4. Recursive Proxy

```typescript
// Exported for advanced use cases (e.g., testing, custom fallback logic)
export function createRecursiveProxy(path: string): any;
```

### 5. SSR Providers

```typescript
// server.ts
import { provideTranslationSSR } from "angular-translation-service/ssr";

const serverConfig: ApplicationConfig = {
  providers: [
    provideTranslationSSR({
      langFromRequest: (req) => detectFromHeaders(req),
    }),
  ],
};
```

---

## Template Usage Patterns

### Pattern A: Scope Signal (recommended for components with many keys)

```html
@let t = common();

<!-- Core namespaces: t is always defined (preloaded). No guard needed. -->
<h1>{{ t.nav.title }}</h1>
<p>{{ t.footer.copyright }}</p>

<!-- Lazy namespaces: use @if guard (also solves Truthiness Trap) -->
@let s = settings(); @if (s) {
<h2>{{ s.appearance.theme }}</h2>
}
```

### Pattern B: Pipe (with colon namespace separator)

```html
<span>{{ 'common:nav.title' | translate }}</span>
<span>{{ 'polls:methods.' + method | translate }}</span>
<p [innerHTML]="'common:footer.html_content' | translate"></p>
```

### Pattern C: Signal binding (recommended for attribute bindings)

```typescript
protected title = this.i18n.translate('common:page_title');
// In template: <title>{{ title() }}</title>
```

### Pattern D: Imperative (for TS-side logic like toasts)

```typescript
this.toast.show(this.i18n.instant("errors:save_failed"));
```

---

## Design Decisions (from Deep Think Review)

### 1. Colon Namespace Separator (`common:nav.title`)

Dots are ambiguous — `common.nav.title` requires guessing where namespace ends. Colon makes parsing unambiguous and enables `translate()` / `TranslatePipe` to auto-trigger `ensureNamespaces()` for unknown scopes.

### 2. The Truthiness Trap Solution

Proxies are **always truthy** in JavaScript. `@if (t().missingKey)` passes even when the namespace hasn't loaded.

**Solution:** `select()` returns `Signal<T | undefined>`. Before load → `undefined` (falsy). After load → proxy-wrapped data.

- **Core namespaces** (preloaded via APP_INITIALIZER): never `undefined` → **zero layout shift**
- **Lazy namespaces**: starts `undefined` → `@if (t)` guard is natural and expected

This avoids Transloco's structural directive approach which would cause layout shift.

### 3. Signal Memory Leak Prevention

`translate(key, params)` caches **only** the base key signal (`Map<string, Signal<string>>`). For parameterized requests, a lightweight **uncached** `computed(() => interpolate(baseSignal(), params))` is returned — garbage collected when the component unmounts.

### 4. Proxy Memoization & Serialization Safety

The recursive proxy **memoizes nested paths** internally (`t().missing.path === t().missing.path`). Traps intercept:

- `toJSON` → returns `{}` (prevents `JSON.stringify` crash)
- `then`/`catch` → returns `undefined` (prevents Promise detection)
- `Symbol.iterator` → yields nothing (safe for `@for`)
- `Symbol.toPrimitive` → returns `''`
- `__ngContext__` and other Angular internals → returns `undefined`

### 5. Dynamic SSR Namespace Serialization

SSR does NOT restrict to `coreNamespaces` only. A request-scoped `Set<string>` tracks **all** namespaces loaded during the SSR lifecycle. All are serialized to `TransferState`. A 1.5s `PendingTasks` timeout prevents hung requests from blocking the server.

### 6. Factory-Based `importLoader`

Dynamic `import()` paths inside `node_modules` fail esbuild/Vite static analysis. The `importLoader` accepts a **user-provided factory callback**: `importLoader((lang, scope) => import(\`./assets/i18n/${lang}/${scope}.json\`))`. The consuming app's bundler can then correctly resolve the directory.

### 7. Fallback Language Chains

When `es-AR/auth.json` is requested, `Promise.all()` concurrently fetches `es-AR` + `es` (fallback). Deep merge (`Object.assign({}, es, esAR)`) ensures missing keys resolve to the fallback language **synchronously** after load.

### 8. CI Type Drift Check

`ats generate --check` flag: asserts generated `.ts` matches current JSON state. Fails the build if stale. Required in CI pipelines.

---

## Architecture

```mermaid
graph TB
    subgraph "Library Package"
        Provider["provideTranslation()"]
        Service["TranslationService"]
        Proxy["createRecursiveProxy()"]
        Pipe["TranslatePipe"]
        Loader["TranslationLoader (pluggable)"]
        SSR["SSR Module (TransferState)"]
    end

    subgraph "App"
        Config["app.config.ts"] --> Provider
        Comp["Components"] --> Service
        Comp --> Pipe
        Template["Templates"] --> Pipe
    end

    Provider --> Service
    Service --> Loader
    Service --> Proxy
    Service --> SSR
    Loader -->|fetch/import| JSON["assets/i18n/en/common.json"]

    subgraph "CLI Tool"
        Gen["generate-i18n-types"] -->|reads| JSON
        Gen -->|emits| Types["i18n.generated.ts"]
        Types -->|typed select()| Service
    end
```

---

## Package Structure

```
angular-translation-service/
├── packages/
│   ├── core/                          # Angular runtime library
│   │   ├── src/
│   │   │   ├── index.ts               # Public API barrel
│   │   │   ├── provide-translation.ts # provideTranslation()
│   │   │   ├── translation.service.ts # TranslationService
│   │   │   ├── translate.pipe.ts      # TranslatePipe
│   │   │   ├── recursive-proxy.ts     # createRecursiveProxy
│   │   │   ├── loader.ts             # TranslationLoader interface + httpLoader
│   │   │   ├── types.ts              # Config types, InjectionTokens
│   │   │   └── language-detection.ts  # Browser/cookie/storage detection
│   │   ├── package.json
│   │   └── ng-package.json
│   │
│   ├── ssr/                           # SSR secondary entry point
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── provide-translation-ssr.ts
│   │   │   └── transfer-state.ts      # TransferState snapshot/hydration
│   │   ├── package.json
│   │   └── ng-package.json
│   │
│   └── cli/                           # CLI tooling suite (bunx/npx)
│       ├── src/
│       │   ├── index.ts               # CLI entry (commander)
│       │   ├── commands/
│       │   │   ├── generate-types.ts   # JSON → TS interfaces (from AfterPic)
│       │   │   ├── check.ts           # Missing/unused key detection (from AfterPic)
│       │   │   ├── validate.ts        # Duplicate key/value detection (from AfterPic)
│       │   │   ├── translate.ts       # LLM batch translation via Ollama (from AfterPic)
│       │   │   └── clean.ts           # Orphaned key removal (from AfterPic)
│       │   ├── llm/
│       │   │   ├── ollama-client.ts    # Ollama API client
│       │   │   ├── prompt-builder.ts   # Context-aware translation prompts
│       │   │   └── batch-translator.ts # Chunked batch translation with fallback
│       │   └── utils/
│       │       ├── json-walker.ts      # Recursive JSON key extraction
│       │       ├── source-scanner.ts   # Source code translation key scanner
│       │       └── file-writer.ts      # Safe JSON file updates with key ordering
│       ├── bin/
│       │   └── ats.ts                 # CLI bin entry: `bunx angular-translation-service`
│       └── package.json
│
├── apps/
│   ├── demo/                          # Demo Angular app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/i18n/
│   │   │   │   ├── en/common.json
│   │   │   │   └── pt-BR/common.json
│   │   │   └── i18n.generated.ts
│   │   └── angular.json
│   │
│   └── editor/                        # Translation Editor (Angular app)
│       ├── src/
│       │   ├── app/
│       │   │   ├── features/
│       │   │   │   ├── file-browser/   # JSON file tree navigator
│       │   │   │   ├── key-editor/     # Side-by-side key editing
│       │   │   │   ├── diff-view/      # Before/after translation diff
│       │   │   │   ├── validation/     # Run checks inline, show warnings
│       │   │   │   └── llm-translate/  # LLM translation panel
│       │   │   └── services/
│       │   │       ├── project.service.ts    # Load project i18n directories
│       │   │       ├── llm.service.ts        # Ollama API integration
│       │   │       └── validation.service.ts # Reuses CLI validation logic
│       │   └── assets/
│       └── angular.json
│
├── package.json                       # Workspace root
├── tsconfig.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Core Library

- [ ] `createRecursiveProxy()` — merge best from GesPatri-web + PollsterGraph
- [ ] `TranslationService` — signals, dictionary, scope cache, namespace loading, dedup
- [ ] `TranslatePipe` — impure pipe wrapping `translate()`
- [ ] `provideTranslation()` — `EnvironmentProviders` config
- [ ] `TranslationLoader` interface + `httpLoader` (fetch-based) + `importLoader` (dynamic import)
- [ ] Language detection chain: cookie → localStorage → browser → SSR token → default
- [ ] `isReady` / `coreLoaded` signal + APP_INITIALIZER integration

### Phase 2: SSR Support

- [ ] `provideTranslationSSR()` — server-side provider
- [ ] TransferState snapshot on server render
- [ ] Synchronous hydration on client from TransferState
- [ ] `PendingTasks` integration for server render blocking
- [ ] `CURRENT_LANGUAGE` InjectionToken for SSR language detection

### Phase 3: CLI Tooling Suite

Refactor and unify scripts from [AfterPic's scripts/](file:///home/igorls/dev/GitHub/duo-fusion-next/scripts) into a proper CLI:

- [ ] `ats generate` — JSON → TS interfaces (`I18nTypes`, `I18nKeys`, `TranslationKey`)
  - Source: [generate-i18n-types.ts](file:///home/igorls/dev/GitHub/duo-fusion-next/scripts/generate-i18n-types.ts) (141 lines)
- [ ] `ats check` — Find missing, unused, and deprecated translation keys by scanning source code
  - Source: [check-translations.ts](file:///home/igorls/dev/GitHub/duo-fusion-next/scripts/check-translations.ts) (886 lines)
- [ ] `ats validate` — Detect duplicate keys, duplicate values, and orphaned keys
  - Source: [validate-translations.ts](file:///home/igorls/dev/GitHub/duo-fusion-next/scripts/validate-translations.ts) (284 lines)
- [ ] `ats translate` — LLM batch translation via Ollama with namespace context
  - Source: [check-translations.ts](file:///home/igorls/dev/GitHub/duo-fusion-next/scripts/check-translations.ts) (the `proposeBatchTranslations` function)
  - Features: chunked batching (35 keys/batch), per-namespace English + target context injection, interactive accept/reject, auto-accept mode
- [ ] `ats clean` — Remove orphaned keys from translation files
  - Source: [remove-orphaned-keys.ts](file:///home/igorls/dev/GitHub/duo-fusion-next/scripts/remove-orphaned-keys.ts) (103 lines)
- [ ] Proper CLI with `commander`, bin entry for `bunx angular-translation-service`

### Phase 4: Translation Editor (Angular App)

- [ ] File browser — navigate i18n directory tree
- [ ] Side-by-side key editor — source language ↔ target language
- [ ] Missing key highlighting with inline validation warnings
- [ ] LLM translate panel — select keys, pick model, generate translations inline
- [ ] Diff view — review proposed changes before saving
- [ ] Reuse CLI validation/translation logic as shared utilities

### Phase 5: Demo + Docs

- [ ] Demo app with language switcher
- [ ] SSR demo
- [ ] README with migration guide from per-project implementations
- [ ] CLI documentation with usage examples

---

## Existing Tooling Inventory (to be unified)

| Script                     | Location | Lines | What It Does                                                          |
| -------------------------- | -------- | ----- | --------------------------------------------------------------------- |
| `check-translations.ts`    | AfterPic | 886   | Source scanner + missing/unused key detection + LLM batch translation |
| `generate-i18n-types.ts`   | AfterPic | 141   | JSON → TypeScript interfaces                                          |
| `validate-translations.ts` | AfterPic | 284   | Duplicate key/value detection + orphan finder                         |
| `remove-orphaned-keys.ts`  | AfterPic | 103   | Clean dead keys from JSON files                                       |
| `auto-translate-styles.ts` | AfterPic | 160   | Orchestrator: validate → translate pipeline                           |
| `check-translations.ts`    | GesPatri | ~200  | Simpler version of the AfterPic check script                          |

---

## Verification Plan

### Automated Tests

Since this is a new library, we'll create tests from scratch:

1. **Unit Tests for `createRecursiveProxy`**
   - Test deep property access returns proxy (not undefined)
   - Test `toString()` / `Symbol.toPrimitive` returns empty string
   - Test `Symbol.iterator` yields nothing (for `@for`)
   - Test Angular lifecycle props return `undefined`
   - Test String methods delegate to `String.prototype`
   - Test proxy caching works
   - **Command**: `bun test packages/core/src/recursive-proxy.spec.ts`

2. **Unit Tests for `TranslationService`**
   - Test `select()` returns signal with proxy before load, real data after
   - Test `translate()` returns cached `computed` signal
   - Test `instant()` returns string synchronously
   - Test `setLang()` reloads all cached namespaces
   - Test `ensureNamespaces()` deduplicates concurrent loads
   - Test param interpolation with `{key}` syntax
   - Test missing key returns key path as fallback
   - **Command**: `bun test packages/core/src/translation.service.spec.ts`

3. **Unit Tests for `TranslatePipe`**
   - Test pipe calls `translate()` and unwraps signal
   - **Command**: `bun test packages/core/src/translate.pipe.spec.ts`

4. **Integration Test: Demo App**
   - Build and serve the demo app
   - Verify language switching updates all visible text
   - Verify `select()` scope pattern works in templates
   - **Command**: `cd apps/demo && bun run build`

### Manual Verification

- Run the demo app locally, switch languages, verify no flash of raw keys
- Verify SSR render contains translated content in page source

> [!IMPORTANT]
> Since this is a greenfield library project, there are no existing tests to leverage. All test infrastructure will be created as part of the implementation.
