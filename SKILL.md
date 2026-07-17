---
name: angular-translation-service
description: >
  Internationalize Angular applications using @angular-translation-service/core and its CLI.
  Use when the user needs to add i18n, translate templates, scan for hardcoded strings,
  generate type-safe translation keys, or interpret a scan report to accelerate
  the internationalization process. Covers Angular v19+ signal-based patterns.
license: MIT
metadata:
  author: igorls
  version: "0.3"
---

# Angular Translation Service — Agent Skill

Signal-based i18n library for Angular v19+ with lazy-loaded namespaces, SSR hydration, and CLI tooling.

## Packages

| Package | Purpose |
|---------|---------|
| `@angular-translation-service/core` | Runtime library (signals, pipe, providers) |
| `@angular-translation-service/core/ssr` | Request language injection for SSR |
| `@angular-translation-service/cli` | CLI tools: scan, generate types, translate, validate, editor, MCP |

## Quick Setup

### 1. Install

```bash
npm install @angular-translation-service/core
npm install -D @angular-translation-service/cli
```

### 2. Create i18n folder structure

**Canonical layout for CLI tooling** (`ats generate`, `check`, `validate`, `translate`, `clean`):

```
src/i18n/
├── en/
│   ├── common.json    # Shared keys (nav, footer, etc.)
│   └── home.json      # Page-specific keys
├── fr/
│   ├── common.json
│   └── home.json
└── de/
    ├── common.json
    └── home.json
```

Each language gets a folder. Each JSON file is a **namespace**.

**Runtime loading:**

| Loader | Put JSON here | Why |
|--------|---------------|-----|
| `httpLoader('/i18n')` | `public/i18n/{lang}/{ns}.json` | Angular serves `public/` at the site root (`/i18n/...`) |
| `importLoader(...)` | e.g. `src/i18n/{lang}/{ns}.json` | Bundler imports from source; no HTTP server needed (SSG) |

Keys may be flat or nested (including mixed keys with literal dots — runtime uses longest-match path resolution):

```json
{
  "nav.home": "Home",
  "nav.docs": "Documentation",
  "hero": {
    "title": "Welcome",
    "subtitle": "Get started today"
  }
}
```

### 3. Configure provider

```typescript
// app.config.ts
import { provideTranslation, httpLoader } from '@angular-translation-service/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideTranslation({
      defaultLang: 'en',
      supportedLangs: ['en', 'fr', 'de'],
      coreNamespaces: ['common'],       // Loaded eagerly on boot
      loader: httpLoader('/i18n'),       // Fetches /i18n/{lang}/{ns}.json
      detectLanguage: true,             // Auto-detect from browser
      storageKey: 'app-lang',           // Persist selection in localStorage
    }),
  ],
};
```

For SSG / prerender without a live HTTP server, prefer `importLoader`:

```typescript
import { provideTranslation, importLoader } from '@angular-translation-service/core';

provideTranslation({
  defaultLang: 'en',
  supportedLangs: ['en', 'fr'],
  coreNamespaces: ['common'],
  loader: importLoader((lang, ns) => import(`./i18n/${lang}/${ns}.json`)),
});
```

### 4. Use translations in templates

**Key format is always `namespace:dotted.path`** (separator defaults to `:`).

**Pipe (simplest):**
```html
<h1>{{ 'home:title' | translate }}</h1>
<p>{{ 'common:greeting' | translate:{ name: userName() } }}</p>
```

Import `TranslatePipe` in the component `imports` array.

**Service (reactive — preferred):**
```typescript
import { TranslationService } from '@angular-translation-service/core';

export class HomeComponent {
  private t = inject(TranslationService);

  // select() loads the namespace lazily and returns a Signal
  home = this.t.select('home');

  // Access keys: this.home()?.title, this.home()?.hero?.subtitle
}
```

```html
@let h = home();
<h1>{{ h?.title }}</h1>
<p>{{ h?.hero?.subtitle }}</p>
```

> Prefer optional chaining (`h?.title`) over wrapping the whole UI in `@if (h)`. Hiding the DOM until load causes layout shift (CLS).

**Language switching:**
```typescript
await this.t.setLang('fr'); // Switches language, reloads active namespaces
```

**Current language signal:**
```typescript
currentLang = this.t.lang; // Signal<string>
```

**Language switcher sketch:**
```typescript
readonly languages = this.t.supportedLangs;
// template: @for (lang of languages; track lang) {
//   <button (click)="t.setLang(lang)" [class.active]="t.lang() === lang">{{ lang }}</button>
// }
```

### 5. SSR / SSG hydration

TransferState snapshot/hydrate is built into `provideTranslation()` (core).  
`provideTranslationSSR` only injects the request language via `CURRENT_LANGUAGE`.

```typescript
// app.config.server.ts
import { provideTranslationSSR } from '@angular-translation-service/core/ssr';

export const serverConfig: ApplicationConfig = {
  providers: [
    provideTranslationSSR({
      langFromRequest: (req) => {
        // Adapt to your server adapter; type is unknown by design
        const headers = (req as { headers?: { get?: (k: string) => string | null } })?.headers;
        const accept = headers?.get?.('accept-language') ?? 'en';
        return accept.split(',')[0]?.split('-')[0] ?? 'en';
      },
    }),
  ],
};
```

For pure SSG/prerender with `importLoader`, core TransferState is usually enough; still set `defaultLang` / prerender routes per locale as needed.

## CLI Reference

The CLI binary is `ats`. **Only `ats editor` and `ats mcp` auto-discover the i18n directory** (angular.json + common paths). Other commands use defaults under `src/i18n` unless you pass flags.

### Canonical paths

| Command | Default input |
|---------|----------------|
| `generate` | `src/i18n/en` |
| `check` | `src/i18n/en` (or root `src/i18n`) |
| `validate` / `clean` | `src/i18n` |
| `translate` | `src/i18n` (`-i` to override) |
| `editor` / `mcp` | auto-detect |

### `ats scan` — Find hardcoded strings

```bash
ats scan --src src --min-score 3
ats scan --verify --model gemma3:12b    # LLM verification via Ollama
ats scan --json                          # Machine-readable output
```

### `ats generate` — Generate TypeScript types

```bash
ats generate -i src/i18n/en -o src/app/i18n.generated.ts
```

### `ats validate` — Check for issues

```bash
ats validate -i src/i18n --default-lang en
```

Without `--default-lang`, the reference language is the first alphabetically sorted locale directory (e.g. `de` before `en`).

### `ats translate` — LLM batch translation

Requires a running [Ollama](https://ollama.com) (or compatible) host.

```bash
ats translate --locale fr --default-lang en --model gemma3:12b
ats translate -i src/i18n --locale pt-BR --auto-accept
```

### `ats check` — Verify key usage

```bash
ats check --i18n src/i18n --src src
```

### `ats clean` — Remove orphan keys

```bash
ats clean -i src/i18n --dry-run --default-lang en
```

### `ats editor` — Visual translation editor

```bash
ats editor --port 4800
```

### `ats mcp` — MCP server for agents

```bash
ats mcp --provider ollama --model qwen3.5:9b
```

## Interpreting the Scan Report

The `ats scan --json` command (or the editor's **Export JSON** button) generates a JSON report optimized for agent consumption.

### Report structure

```json
{
  "generated": "2026-03-10T13:00:00.000Z",
  "source": "src",
  "minScore": 3,
  "totalCandidates": 42,
  "files": {
    "src/app/pages/home.html": [
      {
        "line": 12,
        "element": "h1",
        "score": 7,
        "reasons": ["multi-word", "sentence-case", "long-text"],
        "text": "Welcome to our platform",
        "context": "<h1>Welcome to our platform</h1>",
        "suggestedKey": "home:heading.1",
        "hasInlineCode": false
      }
    ]
  }
}
```

### Field reference

| Field | Description |
|-------|-------------|
| `line` | 1-indexed line number in the source file |
| `element` | Parent HTML element or attribute name (e.g., `h1`, `p`, `aria-label`) |
| `score` | Heuristic confidence score (higher = more likely translatable) |
| `reasons` | Array of reason tags explaining the score |
| `text` | The extracted hardcoded string (full, not truncated) |
| `context` | Source line(s) around the finding — use for direct replace |
| `suggestedKey` | Text-derived `namespace:kebab-slug` key — adopt or override |
| `hasInlineCode` | `true` if context contains `<code>` tags — likely API docs, not UI text |

> **Note**: Entries inside `<pre>` or `<code>` blocks are pre-filtered server-side and never appear in the report.

### Score interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 7-8 | Almost certainly translatable | Extract immediately |
| 5-6 | Very likely translatable | Extract (review context) |
| 3-4 | Possibly translatable | Review — may be technical content |
| 1-2 | Unlikely | Usually skip |

### Reason tags

| Tag | Meaning |
|-----|---------|
| `multi-word` | Contains 2+ words (strong signal for human text) |
| `sentence-case` | Starts with uppercase letter |
| `<h1>`, `<p>`, `<button>` etc. | Inside a semantic HTML element |
| `long-text` | Over 20 characters |
| `paragraph-length` | Over 50 characters |
| `ui-vocabulary` | Contains common UI words (save, cancel, settings, etc.) |
| `attr:title`, `attr:placeholder` | Found in a translatable HTML attribute |
| `single-word-penalty` | Score reduced for single-word outside semantic element |

### Agent workflow for processing scan results

When internationalizing an app based on a scan report, follow this process:

1. **Process by file**: Iterate over `files` keys. For each file, process findings sorted by `score` descending.

2. **Skip documentation strings**: Filter out entries where `hasInlineCode === true`. Also skip any text that appears to be API reference material or technical documentation.

3. **Adopt or override keys**: `suggestedKey` provides a text-derived slug (e.g., `home:returns-scope-signal`). Adopt it or override with a better semantic name.

4. **For each string to extract**:
   ```
   a. Add the key + source text to the source language JSON (e.g., en/common.json)
   b. Use the `context` field to find and replace the hardcoded string in the template
   c. Add placeholder keys for other languages (or use `ats translate` to auto-fill)
   ```

5. **After processing a file**, run `ats validate -i src/i18n --default-lang en`.

### Example transformation

**Before (hardcoded):**
```html
<h1>Welcome to our platform</h1>
<p>Get started in minutes</p>
<button>Sign up free</button>
```

**After (internationalized):**
```html
<h1>{{ 'home:hero.title' | translate }}</h1>
<p>{{ 'home:hero.subtitle' | translate }}</p>
<button>{{ 'home:hero.cta' | translate }}</button>
```

**en/home.json:**
```json
{
  "hero": {
    "title": "Welcome to our platform",
    "subtitle": "Get started in minutes",
    "cta": "Sign up free"
  }
}
```

## Important Rules

- **`translate()` vs `instant()`**: Always use `translate()` (returns `Signal`) or `select()` for reactive UI. `instant()` is non-reactive; if called before a lazy namespace has ever been requested it may start loading that namespace, but the current synchronous call still returns `''`. Call `ensureNamespaces()` first when imperative text must be ready.
- **Namespace loading**: Namespaces in `coreNamespaces` are loaded at boot. All other namespaces are lazy-loaded on first `select()` / `translate()` / `instant()` request.
- **SSR**: `provideTranslation()` owns TransferState. Use `provideTranslationSSR({ langFromRequest })` when the server should pick language from the request.
- **Key format**: Always `namespace:path` for pipe / `translate` / `instant` (default separator `:`). Flat and nested JSON shapes are both supported.
- **Missing keys**: Default returns the raw key string. Configure `missingKeyHandler` for custom behavior.

## Edge Cases

- **Interpolation**: Use `{variable}` in JSON values. `{{variable}}` is tolerated for compatibility.
- **Pluralization**: Not built-in. Use separate keys (`items.one`, `items.many`) and conditional rendering.
- **RTL languages**: Set `dir` on `<html>` from `lang()` (e.g. `rtl` for `ar`, `he`).
- **Missing keys**: `missingKeyHandler?: (key, { lang, namespace }) => string` on the provider config.
- **Lazy routes**: Call `ensureNamespaces(['orders'])` in a route resolver/guard, or rely on first `select('orders')` in the page component.
- **CLI false positives**: `ats check` matches quoted `ns:key` strings anywhere (including docs samples). Prefer real app source for CI, or keep sample keys present in JSON.

## Docs site guides

Published docs include a **Guides** page:

- Troubleshooting (empty text, FOUC, SSR, CLI paths, Ollama, false positives)
- Migration from `@ngx-translate/core`
- Version matrix (core ↔ CLI, Angular peer range)

URL: https://igorls.github.io/angular-translation-service/guides

## Version pairing

| Package | Typical latest |
|---------|----------------|
| `@angular-translation-service/core` | 0.3.x (Angular ^19–^22) |
| `@angular-translation-service/cli` | 0.4.7+ (`ats` binary) |

Install latest of both together unless `CHANGELOG.md` requires a specific pair.
