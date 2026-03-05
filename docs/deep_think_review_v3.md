Here is the code review for the Phase 1 implementation of `angular-translation-service`.

The team has done a phenomenal job executing the architectural plan. The recursive proxy depth cap is elegant, the deep merge algorithm is robust against object mutation, and using the `TranslationService.create()` factory for fast Bun testing (bypassing TestBed overhead) is an excellent DX choice.

However, moving from architectural theory to actual Angular rendering has exposed a few race conditions, a critical flaw in how Pipes handle lazy loading, and a major TypeScript type-safety gap.

Here are the findings from the Phase 1 codebase review.

---

### 🔴 CRITICAL

#### 1. TranslatePipe Silently Fails Lazy Loading & Causes CPU Thrashing

- **Severity**: CRITICAL
- **File**: `packages/core/src/translate.pipe.ts`
- **Category**: 1. Signal Lifecycle / 5. Memory Management
- **Description**: To prevent GC memory leaks, you correctly swapped `TranslatePipe` to use the synchronous `instant()` method. However, `instant()` **never triggers `ensureNamespaces()**`. If a developer uses a pipe for a lazy namespace (`{{ 'lazy:title' | translate }}`), the namespace is never fetched.
Furthermore, because the pipe is `pure: false`, `transform()`runs on **every change detection cycle** (60+ times per second).`instant()` performs string splitting, map lookups, nested object traversal, and regex replacements on every single frame.
- **Impact**: Pipes cannot be used to load lazy namespaces, and pages with multiple pipes will suffer severe UI jank and battery drain.
- **Suggested Fix**: Keep the pipe `pure: false` (to detect language switches), but internally cache the `Signal` instance returned by `translate()`.

```typescript
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);
  private sig?: Signal<string>;
  private lastKey?: string;
  private lastParamsStr?: string;

  transform(key: string, params?: Record<string, string | number>): string {
    const pStr = params ? JSON.stringify(params) : "";
    if (this.lastKey !== key || this.lastParamsStr !== pStr) {
      this.lastKey = key;
      this.lastParamsStr = pStr;
      // translate() safely triggers ensureNamespaces under the hood!
      this.sig = this.i18n.translate(key, params);
    }
    // O(1) read. The template automatically tracks this signal dependency.
    return this.sig!();
  }
}
```

#### 2. String Prototype Delegation Corrupts Translation Keys

- **Severity**: CRITICAL
- **File**: `packages/core/src/recursive-proxy.ts` (lines 76-83)
- **Category**: 2. Proxy Safety Completeness
- **Description**: `createRecursiveProxy` intercepts any property access that exists in `String.prototype`.
- **Impact**: If a developer has a JSON block like `{"actions": {"search": "Search", "replace": "Replace"}}` and accesses `t().actions.search` while the namespace is loading, the proxy returns the native `String.prototype.search` JS function bound to the path string! The UI will render native function code or throw an error when trying to access deeper properties.
- **Suggested Fix**: Delete the `prop in String.prototype` block entirely. You already handle string coercion safely via `toString` and `Symbol.toPrimitive`.

---

### 🟠 HIGH

#### 3. Loss of Template Type Safety (`strictTemplates` Failure)

- **Severity**: HIGH
- **File**: `packages/core/src/translation.service.ts` (line 72) & `generate-types.ts`
- **Category**: 8. CLI Type Generation
- **Description**: The architecture promised `select<K extends keyof I18nTypes>()`, but the implementation downgraded it to `select<K extends string>(): Signal<Record<string, unknown> | undefined>`. Returning a generic `Record` breaks Angular's `strictTemplates` because strongly-typed properties (like `.nav.title`) do not exist on `Record`.
- **Impact**: Complete loss of template autocomplete, and compiler errors in strict mode.
- **Suggested Fix**: Define an empty interface in the library and use TypeScript Module Declaration Merging.

1. Add `export interface I18nTypes {}` to `packages/core/src/types.ts`.
2. Update `select`: `select<K extends keyof I18nTypes>(scope: K): Signal<I18nTypes[K] | undefined>`
3. Update your CLI to append this to the generated file:

```typescript
import "angular-translation-service";
declare module "angular-translation-service" {
  export interface I18nTypes {
    // ... your generated types
  }
}
```

#### 4. Concurrency Race Condition in `setLang()`

- **Severity**: HIGH
- **File**: `packages/core/src/translation.service.ts` (lines 112, 137, 266)
- **Category**: 4. Concurrency Safety
- **Description**: `setLang()` reads `getLoadedNamespaces()`, which checks `this.dictionaries`. If a lazy route calls `select('lazy')`, it starts a network request. If `setLang('pt-BR')` is called a millisecond later, `'lazy'` is **not in the dictionary yet**, so it gets skipped. When the English `'lazy'` finishes loading, the UI will be stuck in English while the rest of the app is in Portuguese.
- **Impact**: Missing namespace data leading to permanently broken UI chunks.
- **Suggested Fix**: Track all _requested_ namespaces, not just loaded ones.

```typescript
private readonly requestedNamespaces = new Set<string>();

async ensureNamespaces(namespaces: string[]): Promise<void> {
    namespaces.forEach(ns => this.requestedNamespaces.add(ns));
    // ...
}
private getLoadedNamespaces(): string[] {
    return Array.from(this.requestedNamespaces);
}

```

#### 5. Unexported Tokens Break SSR Hydration

- **Severity**: HIGH
- **File**: `packages/core/src/index.ts`
- **Category**: 7. SSR Scaffold Quality
- **Description**: `CURRENT_LANGUAGE` and `TRANSLATION_CONFIG` are not exported from the core barrel file.
- **Impact**: The `packages/ssr` package will fail to compile.
- **Suggested Fix**: Add `export { CURRENT_LANGUAGE, TRANSLATION_CONFIG } from './types';` to `packages/core/src/index.ts`.

---

### 🟡 MEDIUM

#### 6. Angular Internals Leak & Path Loss in `wrapWithProxy`

- **Severity**: MEDIUM
- **File**: `packages/core/src/translation.service.ts` (lines 316-340)
- **Category**: 2. Proxy Safety Completeness
- **Description**: When a missing key is accessed inside a _loaded_ namespace, `wrapWithProxy` returns `createRecursiveProxy(prop)`.

1. `prop` is just the leaf node (e.g., `'missing'`). It loses the parent path (`'common:nav.missing'`), harming debugging.
2. It fails to guard against `ANGULAR_INTERNALS`. If Angular probes `t().__ngContext__` on a loaded scope, it gets a Proxy back instead of `undefined`.

- **Suggested Fix**: Import `ANGULAR_INTERNALS` and pass the path down recursively.

```typescript
private wrapWithProxy(data: Record<string, unknown>, path: string): Record<string, unknown> {
    const self = this;
    return new Proxy(data, {
        get(target, prop: string | symbol): unknown {
            if (typeof prop === 'string' && ANGULAR_INTERNALS.has(prop)) return undefined;
            if (prop === 'then' || prop === 'catch') return undefined;

            const value = target[prop as string];
            const childPath = path ? `${path}.${prop as string}` : (prop as string);

            if (value === undefined) return createRecursiveProxy(childPath);
            if (typeof value === 'object' && value !== null) {
                return self.wrapWithProxy(value as Record<string, unknown>, childPath);
            }
            return value;
        }
    });
}

```

#### 7. TransferState Map Serialization Trap

- **Severity**: MEDIUM
- **File**: `packages/ssr/src/transfer-state.ts`
- **Category**: 7. SSR Scaffold Quality
- **Description**: You plan to serialize `this.dictionaries` in Phase 2. However, `this.dictionaries` uses ES6 `Map` instances (`Map<string, Map<string, Record>>`). `TransferState` uses `JSON.stringify()`, which serializes all `Map` instances as empty objects `{}`.
- **Suggested Fix**: Add `exportState(): Record<string, any>` and `importState(state)` methods to the core service to convert Maps to plain objects for SSR.

---

### 🟢 LOW

#### 8. Hyphen Support in Interpolation Regex

- **Severity**: LOW
- **File**: `packages/core/src/translation.service.ts` (line 309)
- **Category**: 6. Test Coverage Gaps
- **Description**: The regex `/\{\{?\s*(\w+)\s*\}?\}/g` uses `\w`, which only matches `[a-zA-Z0-9_]`. It fails to interpolate params containing hyphens (e.g., `{user-name}`).
- **Suggested Fix**: Update the capture group: `([\w-]+)`.

---

## Final Assessment

- **Total Counts**: 2 CRITICAL, 3 HIGH, 2 MEDIUM, 1 LOW
- **Top 3 Priorities Before Phase 2**:

1. Fix the **TranslatePipe signal caching** to prevent CPU thrashing and restore lazy loading.
2. Implement **Declaration Merging** to reconnect the CLI types to the library.
3. Fix the **Language Switch Race Condition** using the `requestedNamespaces` Set.

- **Overall Confidence Level: 92%**.
  Phase 1 is in exceptional shape. The core reactivity logic using the `version` signal is mathematically sound, and your `deepMerge` gracefully handles nested overwrites without mutating references. Patch the Angular ecosystem edge-cases listed above, and you are 100% ready to tackle SSR in Phase 2.

### Questions from v2 Answered

- _Will TransferState integration work cleanly with the version signal + dictionary architecture?_
  **Yes**, as long as you add the `exportState/importState` methods mentioned in Finding 7 to handle `Map` serialization. Hydrating the plain objects back into Maps and bumping the `version` signal will instantly light up the UI flawlessly on the client.
