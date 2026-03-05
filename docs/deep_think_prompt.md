# Architecture Review — angular-translation-service

## Project Context

We are building `angular-translation-service`, an Angular library for runtime, signal-based internationalization (i18n). This is the result of 7+ iterations across production Angular projects (GesPatri, PollsterGraph, CheckZone, AfterPic/duo-fusion-next, Aura Companion), each evolving the same core pattern. The library targets Angular v19–21, supports SSR with TransferState hydration, and aims to be zoneless-compatible.

The library is **not** a wrapper around `@angular/localize`, `ngx-translate`, or Transloco. It is a ground-up implementation that emerged from production patterns, with novel features like recursive proxy fallbacks and scope-based signal selectors.

## Review Scope

Please review the attached **implementation plan** for architectural soundness, API ergonomics, and potential pitfalls. We want to validate the design before writing code.

## Attached Context Packs

| File                               | Contents             | Description                                                                                   |
| ---------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `implementation_plan.md`           | Library design       | Full architecture, public API, competitive analysis, package structure, implementation phases |
| `translation_services_analysis.md` | Source code research | Analysis of all 7 existing implementations with feature comparison matrix                     |

## Focus Areas

1. **API Surface Design** — Is the triple API (`select()`, `translate()`, `instant()`) the right granularity? Are there redundancies, ambiguities, or missing methods? Should `select()` return a proxy-wrapped signal or a plain typed signal? Should `translate()` cache signals by key?

2. **Recursive Proxy Risks** — The proxy is our core innovation: it prevents template crashes during async loading by intercepting property access. But Proxies have edge cases with Angular's change detection, `JSON.stringify()`, equality checks, and DevTools debugging. Are there hidden dangers we should address in the design?

3. **SSR Hydration Strategy** — We plan to snapshot translations via `TransferState` on the server and hydrate synchronously on the client. Is this the optimal approach? Are there race conditions between `TransferState` hydration and lazy namespace loading? What about `PendingTasks` interaction with `provideAppInitializer`?

4. **Namespace Architecture** — We use per-scope JSON files (`assets/i18n/en/common.json`, `assets/i18n/en/auth.json`). Is this better than single-file-per-language? How should the library handle cross-namespace keys? Should it merge namespaces into a flat dictionary or keep them isolated?

5. **Type Generation Strategy** — We auto-generate TypeScript interfaces from JSON files via a CLI. Is this better than Transloco's approach (manual types) or `ngx-signal-i18n`'s approach (TS-first translations)? What are the risks of generated types drifting from JSON?

6. **Loader Architecture** — We propose `httpLoader()` (fetch-based) and `importLoader()` (dynamic import). Is the pluggable loader interface the right abstraction? Should we support custom loaders (e.g., from a CMS API)?

7. **Missing Features** — Compare against the competitive analysis table. Are there features from `@ngx-runtime-i18n` (ICU-lite, cancellation-aware switching, fallback chains), Transloco (structural directive), or `@angular/localize` (plural/gender rules) that we should include in v1 vs defer to v2?

8. **Package Structure** — Is the `core` / `ssr` / `cli` split the right boundary? Should SSR be part of core with tree-shaking, or a separate entry point? Should the CLI be its own package or a bin script in core?

## Output Format

For each finding, provide:

- **Category**: Which focus area (1–8)
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Description**: What the issue or recommendation is
- **Rationale**: Why this matters for production Angular apps
- **Suggested Change**: Concrete recommendation

End with a summary: overall assessment, top 3 recommendations, and any blind spots in the competitive analysis.
