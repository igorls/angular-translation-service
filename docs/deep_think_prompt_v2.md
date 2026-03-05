# Follow-up Architecture Review — angular-translation-service

## Context

This is a follow-up to the initial architecture review. We received 8 findings (2 CRITICAL, 2 HIGH, 3 MEDIUM, 1 LOW) and have designed solutions for each. We'd like you to validate our approaches, identify any remaining gaps, and flag anything we may have overcorrected on.

**Important constraint:** The library must work equally well for **CSR-only** apps and **SSR** apps. The SSR support (`provideTranslationSSR()`) is a separate optional import — CSR apps never pull in TransferState, PendingTasks, or Node.js code. Please evaluate our solutions with both deployment modes in mind.

## Attached Context Packs

| File                      | Contents                                          |
| ------------------------- | ------------------------------------------------- |
| `implementation_plan.md`  | Updated library design with all solutions applied |
| `deep_think_review_v1.md` | Your original review findings                     |

## Solutions to Each Finding

### Finding 1 (CRITICAL): Template API & Signal Memory Leaks

**Your concern:** `@let t = common()` hides signal execution, breaking reactive tracking. Parameterized `translate()` caching leaks signals indefinitely.

**Our solution:**

- Template syntax uses standard signal execution: `{{ t.nav.title }}` where `t` comes from `@let t = common()` (the `common` field is the signal, `.nav.title` is proxy property access on the unwrapped value)
- `translate(key, params)` caches **only the base key** in a `Map<string, Signal<string>>`. Parameterized calls return an **uncached** `computed(() => interpolate(baseSignal(), params))` that GC collects when the component unmounts

**Questions for you:**

1. Is the uncached `computed` for params sufficient, or should we use a `WeakRef`-based cache to avoid re-creating the same computed if the same params object is passed repeatedly?
2. Does Angular's `computed()` correctly GC when no template reads it, or does it require explicit cleanup?

---

### Finding 2 (CRITICAL): Recursive Proxy Serialization & Identity Traps

**Your concern:** Infinite proxies crash DevTools, break `JSON.stringify`, and new proxy instances per access cause `NG0100`.

**Our solution:**

- Internal **memoization cache** ensures `t().missing.path === t().missing.path` (referential stability)
- Explicit traps: `toJSON` → `{}`, `then/catch` → `undefined`, `Symbol.iterator` → empty iterator, `Symbol.toPrimitive` → `''`, `__ngContext__` → `undefined`
- GesPatri's existing `createRecursiveProxy` already memoizes via a `PROXY_CACHE` Map — we're extending this

**Question:** Should we cap proxy depth (e.g., max 10 levels) and return a frozen empty object beyond that, or is memoization alone sufficient to prevent DevTools stack overflow?

---

### Finding 3 (HIGH): SSR Hydration Mismatch on Lazy Routes

**Your concern:** Only serializing `coreNamespaces` to TransferState misses lazy-loaded namespaces rendered during SSR.

**Our solution:** A request-scoped `Set<string>` tracks **all** namespaces loaded during the SSR lifecycle. All are serialized to TransferState. A 1.5s `PendingTasks` timeout prevents hung requests from blocking the Node.js server.

**Question:** Should the timeout be configurable? And should we emit a warning log when a timeout fires, so developers can identify slow translation endpoints?

---

### Finding 4 (HIGH): Bundler Compliance for Dynamic Imports

**Your concern:** `importLoader('/assets/i18n')` fails esbuild/Vite because the bundler can't statically analyze dynamic paths inside node_modules.

**Our solution:** `importLoader` accepts a **user-provided factory callback**:

```typescript
importLoader((lang, scope) => import(`./assets/i18n/${lang}/${scope}.json`));
```

The consuming app's bundler resolves the directory at compile time.

**No questions — we believe this is resolved.**

---

### Finding 5 (MEDIUM): Namespace Ambiguity

**Your concern:** Dots for both namespace and object path creates parsing ambiguity.

**Our solution:** Adopted colon separator: `common:nav.title`. Additionally, `translate()` and `TranslatePipe` auto-trigger `ensureNamespaces()` when they encounter an unknown namespace — no manual preloading required for pipe/translate usage.

**Question:** Should the separator be configurable (defaulting to `:`) for teams migrating from dot-based systems, or is a hard `:` better for ecosystem consistency?

---

### Finding 6 (MEDIUM): Fallback Language Chains

**Your concern:** Missing keys should fall back through regional chain (es-AR → es → en), not return raw proxy strings.

**Our solution:** Config accepts `fallbackChain: { 'pt-BR': ['pt', 'en'], 'es-AR': ['es', 'en'] }`. When a namespace is requested, `Promise.all()` concurrently fetches the language + all fallbacks. Deep merge (`Object.assign({}, en, es, esAR)`) ensures missing keys resolve synchronously from the fallback.

**Question:** Should partial fallback chains (e.g., `es-AR` has the key but `es` doesn't) skip intermediate languages, or always merge the full chain? Full chain is simpler but increases network requests.

---

### Finding 7 (MEDIUM): Type Drift from JSON

**Your concern:** Generated TypeScript files can go stale if JSON changes without re-running the CLI.

**Our solution:** `ats generate --check` flag that asserts the generated `.ts` file matches current JSON state. Designed for CI enforcement (exit code 1 if stale).

**No questions — we believe this is resolved.**

---

### Finding 8 (LOW): Node.js Tooling Leakage

**Your concern:** CLI code risks leaking `fs`/`path` into browser bundles.

**Our solution:** CLI is already a **separate package** (`packages/cli/`) with its own `package.json`, completely excluded from the Angular library's module graph. The bin entry is in the CLI package only.

**No questions — this was already handled by our package structure.**

---

### Blind Spot: The Truthiness Trap

**Your insight:** Proxies are always truthy in JavaScript, so `@if (t().missingKey)` incorrectly passes during loading.

**Our solution:** `select()` returns `Signal<T | undefined>` — not `Signal<T>`.

- Before namespace loads → `undefined` (falsy)
- After load → proxy-wrapped real data

This creates a natural two-layer pattern:

```html
@let t = common();
<!-- core namespace: always defined, never undefined -->
@let s = settings();
<!-- lazy namespace: undefined until loaded -->

@if (s) {
<!-- natural guard: prevents truthiness trap AND is the loading state -->
<h2>{{ s.appearance.theme }}</h2>
}
```

**Key insight:** Core namespaces are preloaded via `APP_INITIALIZER`, so they are never `undefined` — **zero layout shift**. Only lazy namespaces experience the `undefined` → data transition, which is exactly when you'd want a loading guard anyway.

**This avoids Transloco's structural directive approach**, which defers ALL rendering (causing layout shift even for preloaded translations).

**Questions:**

1. Is `Signal<T | undefined>` the right type, or should we use a discriminated union like `Signal<{ loaded: false } | { loaded: true, data: T }>` for more explicit state?
2. For core namespaces that are guaranteed preloaded, should we offer a stricter overload `selectCore<K>()` returning `Signal<T>` (no undefined) to avoid unnecessary null checks?

## Output Format

For each of our solutions, provide:

- **Verdict**: APPROVED / NEEDS REVISION / OVERCORRECTED
- **Notes**: Any refinements, edge cases we missed, or corrections
- Answer our specific questions

End with: overall confidence level, top remaining risk, and whether we're ready to start implementation.
