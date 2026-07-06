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
  version: "0.2"
---

# Angular Translation Service — Agent Skill

Signal-based i18n library for Angular v19+ with lazy-loaded namespaces, SSR hydration, and CLI tooling.

## Packages

| Package | Purpose |
|---------|---------|
| `@angular-translation-service/core` | Runtime library (signals, pipe, providers) |
| `@angular-translation-service/core/ssr` | SSR/SSG hydration via TransferState |
| `@angular-translation-service/cli` | CLI tools: scan, generate types, translate, validate |

## Quick Setup

### 1. Install

```bash
npm install @angular-translation-service/core
npm install -D @angular-translation-service/cli
```

### 2. Create i18n folder structure

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

Each language gets a folder. Each JSON file is a **namespace**. Keys use flat or nested format:

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
      loader: httpLoader('/i18n'),       // Base URL for JSON files
      detectLanguage: true,             // Auto-detect from browser
      storageKey: 'app-lang',           // Persist selection in localStorage
    }),
  ],
};
```

### 4. Use translations in templates

**Pipe (simplest):**
```html
<h1>{{ 'home.title' | translate }}</h1>
```

**Service (reactive — preferred):**
```typescript
import { TranslationService } from '@angular-translation-service/core';

export class HomeComponent {
  private t = inject(TranslationService);

  // select() loads the namespace lazily and returns a Signal
  home = this.t.select('home');

  // Access keys: this.home().title, this.home().hero.subtitle
}
```

```html
<h1>{{ home().title }}</h1>
<p>{{ home().hero.subtitle }}</p>
```

**Language switching:**
```typescript
this.t.use('fr'); // Switches language, reloads active namespaces
```

**Current language signal:**
```typescript
currentLang = this.t.lang; // Signal<string>
```

### 5. SSR / SSG hydration

```typescript
// app.config.server.ts
import { provideTranslationSSR } from '@angular-translation-service/core/ssr';

export const serverConfig: ApplicationConfig = {
  providers: [provideTranslationSSR()],
};
```

This captures loaded translations on the server and hydrates them on the client, avoiding double-fetch.

## CLI Reference

The CLI binary is `ats`. All commands auto-discover the i18n directory from `angular.json`.

### `ats scan` — Find hardcoded strings

Scans HTML templates for text that should be translated.

```bash
ats scan --src src --min-score 3
ats scan --verify --model gemma3:12b    # LLM verification via Ollama
ats scan --json                          # Machine-readable output
```

### `ats generate` — Generate TypeScript types

Creates type-safe key definitions from your JSON files.

```bash
ats generate
```

### `ats validate` — Check for issues

Finds missing keys, empty values, and structural mismatches across languages.

```bash
ats validate
```

### `ats translate` — LLM batch translation

Translates missing keys using a local Ollama model.

```bash
ats translate --source en --target fr --model gemma3:12b
```

### `ats check` — Verify key usage

Checks if translation keys used in source code exist in JSON files.

```bash
ats check --src src
```

### `ats editor` — Visual translation editor

Launches a web UI for managing translations, with scan, translate, and validate panels.

```bash
ats editor --port 4500
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
        "codeExample": false
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
| `context` | Source line(s) around the finding — use for direct `replace_file_content` |
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

2. **Skip documentation strings**: Filter out entries where `hasInlineCode === true`. Also skip any text that appears to be API reference material or technical documentation, even if `hasInlineCode` is false.

3. **Adopt or override keys**: `suggestedKey` provides a text-derived slug (e.g., `home:returns-scope-signal`). Adopt it directly or override if you can derive a better semantic name.

4. **For each string to extract**:
   ```
   a. Add the key + source text to the source language JSON (e.g., en/common.json)
   b. Use the `context` field to find and replace the hardcoded string in the template
   c. Add placeholder keys for other languages (or use `ats translate` to auto-fill)
   ```

5. **After processing a file**, run `ats validate` to check for structural issues.

### Example transformation

**Before (hardcoded):**
```html
<h1>Welcome to our platform</h1>
<p>Get started in minutes</p>
<button>Sign up free</button>
```

**After (internationalized):**
```html
<h1>{{ 'home.hero.title' | translate }}</h1>
<p>{{ 'home.hero.subtitle' | translate }}</p>
<button>{{ 'home.hero.cta' | translate }}</button>
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

- **`translate()` vs `instant()`**: Always use `translate()` (returns Signal) or `select()` for reactive access. `instant()` is non-reactive; if it is called before a lazy namespace has ever been requested it may start loading that namespace, but the current synchronous call still returns `''`.
- **Namespace loading**: Namespaces in `coreNamespaces` are loaded at boot. All other namespaces are lazy-loaded on first `select()` call.
- **SSR**: Always add `provideTranslationSSR()` in the server config to avoid hydration mismatch errors (NG0501).
- **Key format**: Both flat (`"nav.home": "Home"`) and nested (`{ "nav": { "home": "Home" } }`) formats are supported. Don't mix in the same namespace.

## Edge Cases

- **Interpolation in translations**: Use `{variable}` syntax in JSON values. Existing `{{variable}}` placeholders are tolerated for compatibility, but `{variable}` is the canonical form.
- **Pluralization**: Not built-in. Use separate keys (`items.one`, `items.many`) and conditional rendering.
- **RTL languages**: The library handles text direction via `CURRENT_LANGUAGE`. Set `dir` attribute on `<html>` reactively.
- **Missing keys**: By default, the raw key string is shown. Configure `missingKeyHandler` in the provider for custom behavior.
