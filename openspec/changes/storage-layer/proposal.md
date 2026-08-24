## Why

The app has no way to persist user configuration (API key, base URL, model, language pair). IDB is a project learning goal and a hard requirement — without it the setup modal can't decide whether to show, and the API key can't survive a page reload. Build the foundation before any UI that depends on config.

## What Changes

- Add `src/lib/storage.ts` — async API over raw IndexedDB for reading/writing app config.
- Introduce a typed `AppConfig` shape covering provider (base URL, model) and language pair (two languages, no direction implied).
- Graceful degradation: when IDB is unavailable (third-party iframe blocking), fall back to session-only in-memory store so the app never crashes or loops the setup modal.
- Vitest coverage for storage serialization logic (config round-trip, defaults, schema migration stub).

## Capabilities

### New Capabilities

- `config-storage`: Persistent configuration storage using IndexedDB, including the config schema, read/write API, loading state and fallback indicators, and graceful degradation when IDB is unavailable.

### Modified Capabilities

None.

## Impact

- **New file**: `src/lib/storage.ts`
- **New test file**: `src/lib/storage.test.ts`
- **Config type** (likely in `src/lib/types.ts` or inline in `storage.ts`) — will be consumed by future provider and UI code.
- **No dependency changes** — raw IndexedDB API, no `idb` wrapper per project rules.
- **No existing code affected** — the scaffold placeholder doesn't use config yet.
