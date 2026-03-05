# angular-translation-service

Signal-based Angular i18n library with runtime language switching, SSR hydration, and developer tooling.

> 🚧 Under active development — not yet published to npm.

## Features

- **Signals-first** — All reactive state via Angular Signals, zero RxJS dependency
- **Runtime language switching** — No page reload, no separate builds
- **Namespace-scoped lazy loading** — Only load what you need, when you need it
- **SSR + Hydration safe** — TransferState integration, PendingTasks blocking
- **Type-safe** — Auto-generated interfaces from JSON files
- **Crash-proof** — Recursive proxy prevents template errors during loading
- **Tiny** — Zero dependencies beyond `@angular/core`, target < 4kb gzipped
- **CLI tooling** — Type generation, validation, LLM-powered translation

## Packages

| Package         | Description                                               |
| --------------- | --------------------------------------------------------- |
| `packages/core` | Angular runtime library                                   |
| `packages/ssr`  | SSR secondary entry point (TransferState, PendingTasks)   |
| `packages/cli`  | CLI tooling suite (type gen, validation, LLM translation) |

## Apps

| App           | Description                              |
| ------------- | ---------------------------------------- |
| `apps/docs`   | Documentation site (Angular SSG)         |
| `apps/demo`   | Demo Angular app with language switcher  |
| `apps/editor` | Translation file editor with LLM support |

## License

MIT
