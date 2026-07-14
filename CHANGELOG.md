# Changelog

## core 0.3.4 / cli 0.4.6 (2026-07-14)

### Core

- **Fixed resolution of dictionary keys that contain literal dots.** Paths like
  `operator:apiAccess.webhooks.eventLabels.lead.captured` now resolve when the
  pack stores `"lead.captured"` as a single object property (not nested
  `lead.captured` objects). Resolution uses longest-match at each path level so
  nested objects continue to work as before.
- Exported `resolveDottedPath` helper used by the service (available for tests /
  advanced tooling).

### CLI

- `getNestedValue` uses the same longest-match rules so `ats check` / validate
  stay consistent with runtime resolution.

## 0.4.4 / core 0.3.2 (2026-06-22)

### Core

- Added Angular 22 to the supported peer dependency range.
- Updated the Angular packaging toolchain to Angular 22, ng-packagr 22, and TypeScript 6.
- Explicitly builds the library with the package tsconfig while preserving partial compilation output for npm consumers.

### Docs

- Updated the docs app to Angular 22.

### CLI

- Patch release to keep the `publish:all` workflow publishable alongside the core compatibility release.

## 0.4.1 (2026-03-11)

### CLI

- **Fixed editor UI not loading in published package** — The 8 JS module files powering the editor were loaded via runtime `readFileSync` but never included in the npm tarball. The editor HTML/CSS rendered but the UI was completely non-interactive.
  - Added `scripts/bundle-js-modules.ts` pre-build step that inlines all JS modules as string constants in a generated TypeScript file.
  - Modified `ui/index.ts` to import embedded modules instead of reading from disk.
  - Updated `build:cli` script to run the pre-build step automatically.

## 0.4.0 (2026-03-11)

### CLI — MCP Server

- **New tool: `update_key`** — Set a single translation key for a single language without affecting other languages or keys.
- **New tool: `translate_stale`** — Detects and re-translates keys where the source (default) language value has changed since the last translation. Uses djb2 content hashing with `.ats-hashes.json` sidecar files per target language.
- **Fixed `add_key` overwrite behavior** — Now only writes to languages explicitly specified in the `values` map. Previously wrote empty strings to all unspecified languages, destroying existing translations.
- **Source hash tracking** — `translate_keys` and `translate_missing` now automatically record source-value hashes after each batch, enabling end-to-end stale translation detection.
- Tool count: 14 → 16 (added `update_key`, `translate_stale`).

### Docs

- Added `ats mcp` section to CLI documentation page with command usage, 7-option table, tool categories, IDE config JSON snippet, and feature list.
- Updated "LLM Translation" feature card on homepage to mention MCP server.
- Translated all new content to 8 languages (de, en, es, fr, ja, pt-BR, ru, zh).

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
