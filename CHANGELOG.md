# Changelog

## 0.3.0 (2026-03-10)

### CLI

- **Editor modular refactor**: Split monolithic `editor-server.ts` and `editor-ui.ts` into modular architecture — separate handler, route, type, and ESM UI modules.
- **Scan export redesign**: Export is now agent-optimized JSON instead of Markdown.
  - Semantic text-derived `suggestedKey` slugs with stop-word filtering and collision detection.
  - `hasInlineCode` boolean for detecting API documentation content.
  - Dynamic multi-line `context` window sized by text length.
  - Code example entries (`<pre>`/`<code>` blocks) pre-filtered server-side.
  - Default `minScore` raised to 5 for cleaner output.
- **Scanner hardening** (via Gemini Deep Think architecture review):
  - Disqualify Angular template bindings (`(click)=`, `[prop]=`, `*ngIf=`).
  - Disqualify unclosed HTML tag fragments and raw attribute assignments.
  - Identical strings in the same namespace reuse the same `suggestedKey`.
- **Custom dropdowns**: Replaced native `<select>` elements with themed custom dropdown components.
- **Lucide icons**: Replaced emoji icons with Lucide SVG icons throughout the editor UI.
- **AI provider support**: Added provider selection dropdown (Ollama, OpenAI, etc.) in the editor sidebar.
- **Default language highlight**: Default language sorted to top of progress list with visual separator.

### Docs

- Added `SKILL.md` agent documentation for AI-assisted i18n workflows.
- Internationalized homepage with translations for 8 languages (de, en, es, fr, ja, pt-BR, ru, zh).
- Added `<pm-tabs>` package manager tab component.

### Meta

- Added `CHANGELOG.md`.
- Added `README.md` for both `@angular-translation-service/core` and `@angular-translation-service/cli`.

## 0.2.1 (2026-03-10)

### Breaking

- **Core package renamed** from `angular-translation-service` to `@angular-translation-service/core`.
  All imports must be updated: `from '@angular-translation-service/core'` and `from '@angular-translation-service/core/ssr'`.

### CLI

- Ported editor server from `Bun.serve()` to Node.js `http.createServer()` — editor now works with any runtime.
- Fixed all remaining `bunx` references in source code and error messages.

### Docs

- Added `<pm-tabs>` component showing tabbed npm/pnpm/bun install commands.
- Added SVG favicon.
- Updated all code examples to use `@angular-translation-service/core`.

### Meta

- Added README.md for `@angular-translation-service/core` and `@angular-translation-service/cli` packages.
- Updated root README.md with scoped package names and npm badges.

## 0.2.0 (2026-03-10)

### CLI

- **BREAKING**: The CLI no longer requires Bun. It now runs on any JavaScript runtime (Node.js, Bun, Deno).
- Changed build target from `--target bun` to `--target node` for universal compatibility.
- Fixed `bin` entry to point directly at the compiled `dist/index.js` bundle.
- Removed broken `bin/ats.ts` indirection layer.
- Users can now run the CLI via:
  - `npx ats <command>` (with `@angular-translation-service/cli` as a devDependency)
  - `ats <command>` (with a global install)
  - `npx @angular-translation-service/cli <command>` (one-off, no install)

### Core

- Made `TranslatePipe` impure and trigger change detection via `ApplicationRef` for zoneless Angular support.
- Fixed FOUC (flash of untranslated content) by returning empty strings during loading.
- Integrated zero-config `TransferState` for seamless SSR/SSG hydration.

### Docs

- Updated all CLI examples from `bunx ats` to `npx @angular-translation-service/cli`.
- Updated CI integration example to use `actions/setup-node` instead of `oven-sh/setup-bun`.
- Installation section now documents global install, devDependency, and one-off usage patterns.

## 0.1.0 (2026-03-08)

Initial release.

- Signal-based `TranslationService` with `translate()`, `instant()`, and `select()` APIs
- Lazy-loading of translation namespaces with HTTP auto-discovery
- `TranslatePipe` for template usage
- SSR support via `angular-translation-service/ssr` sub-entry with `TransferState` hydration
- CLI tools: `generate`, `check`, `validate`, `clean`, `translate`, `scan`, `editor`
- Documentation app with full API reference
