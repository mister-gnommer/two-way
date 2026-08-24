## Context

The app is a single-page Astro static site with one Svelte 5 island (`App.svelte`). Config (provider settings, language pair) must persist across page loads. IndexedDB was chosen over localStorage because it's a learning goal and handles structured data better. The app runs in third-party iframes (start.me) where IDB may be blocked. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a small async API for reading/writing app config via raw IndexedDB.
- Handle IDB unavailability by falling back to in-memory session storage.
- Version the config schema for future migrations.
- Expose loading state so the UI can show a spinner before deciding on the setup modal.
- Be testable with vitest (serialization logic, fallback behavior).

**Non-Goals:**
- Multi-pair storage or pair switching (post-beta).
- Migration of existing stored data (first version — no data to migrate yet, but the version marker must be in place).
- Any UI component — this is pure library code.
- Encryption of the API key at rest (it lives in the user's own browser IDB; same threat model as any password field).

## Decisions

### IDB schema: single object store, single document

Store all config as one record in a single object store (e.g. store name `config`, key `current`). Avoids multi-record complexity for a single-pair app.

**Alternatives considered:** Separate records per field — rejected; config is small enough and always read/written as a unit. Separate stores per config section — rejected; over-engineered for beta scope.

### Config shape

```ts
interface AppConfig {
  provider: {
    baseUrl: string;
    model: string;
    apiKey: string;
  };
  pair: {
    a: string;  // ISO 639-1 code, e.g. "pl"
    b: string;  // ISO 639-1 code, e.g. "en"
  };
}
```

Flat and explicit. `pair.a` / `pair.b` are unordered — neither implies source or target, since detection decides direction at runtime. No optional fields — a "configured" app has all fields populated; absence means no config.

### API surface

```ts
function createStorage(): Storage
interface Storage {
  readonly loading: Writable<boolean>   // Svelte 5 rune-compatible reactive signal
  readonly inmemoryFallback: Writable<boolean>  // true when in-memory fallback is active
  load(): Promise<AppConfig | null>
  save(config: AppConfig): Promise<void>
}
```

- `createStorage()` is the factory — returns a fresh instance with its own reactive signals.
- `load()` reads from IDB (or session fallback), sets `loading` to `false` when done.
- `save()` writes to IDB (or session fallback).
- `inmemoryFallback` becomes `true` when IDB fails and the in-memory store takes over; stays `true` for the instance lifetime. UI can bind to this for a future warning banner.

`openDb` / `readConfig` / `writeConfig` are also exported, but only so unit tests can exercise the IDB helpers directly (task 2.1). They are **not** part of the app-facing API — components should go through `createStorage()`. Doc comments mark them as internal.

**Alternatives considered:** Singleton module with module-level state — rejected; factory pattern is testable and avoids shared mutable state between test cases.

### Fallback strategy

On any IDB open/read/write error, catch, set the `inmemoryFallback` signal to `true`, and switch to an in-memory `Map` for the session. Log a warning to `console.warn` for debugging. Don't retry IDB.

**Alternatives considered:** localStorage fallback — rejected; if IDB is blocked in a third-party iframe, localStorage often is too (same partitioning rules). Memory-only is simpler and honest about not persisting.

### Schema versioning

Version 1 is the initial schema. Store as `{ _version: 1, ...config }`. On read, check `_version` — if missing or higher than current, treat as no config. A present-but-unreadable record (unknown version, corrupted shape) also logs a `console.warn` with the detected version — a genuine first visit (no record) stays silent, so the two are distinguishable in the console. The warn never includes record contents (the API key could be in there). Future migrations can add `onversionchange` handlers.

**Alternatives considered:** `IDBDatabase.onupgradeneeded` with full migration logic — correct for future use, but premature now; the version check + null return is sufficient for v1.

### Testing approach

Use `fake-indexeddb` in vitest to test the real IDB path. Test the fallback path by injecting a mock that throws on open. Test serialization round-trips and version handling.

## Risks / Trade-offs

- **[IDB blocked in Safari iframe]** → Mitigated by in-memory fallback. User re-enters key each visit, but the app works.
- **[Schema migration in future versions]** → Mitigated by versioning from day one. Migration code itself is deferred to when it's needed.
- **[Raw IDB is verbose]** → Acceptable trade-off for the learning goal. The API surface is small (~4 public methods) so the boilerplate is contained.
