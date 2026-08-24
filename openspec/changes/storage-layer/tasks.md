## 1. Types and Dependencies

- [x] 1.1 Add `fake-indexeddb` as a dev dependency (pinned exact version) in `package.json` and verify `npm install` succeeds
- [x] 1.2 Create `src/lib/types.ts` with the `AppConfig` interface (provider.baseUrl, provider.model, provider.apiKey, pair.a, pair.b) and the `StoredRecord` wrapper type with `_version` field. Verify `npx tsc --noEmit` passes

## 2. Core Storage Implementation

- [x] 2.1 Implement IDB open/read/write helpers in `src/lib/storage.ts`: `openDb()` opens database `two-way-config` with object store `config` (key path `id`), `readConfig()` reads the `current` key, `writeConfig()` puts a versioned record. Verify the IDB helpers test passes (round-trip write then read returns matching config)
- [x] 2.2 Implement in-memory fallback store in `src/lib/storage.ts`: a `Map`-backed implementation used when IDB operations throw. Verify the fallback test passes (write succeeds, read returns what was written, new `createStorage()` instance returns null on load)
- [x] 2.3 Implement `createStorage()` factory that returns the `Storage` interface (`load`, `save`, `loading`, `inmemoryFallback`). On `load()`, attempt IDB read; on failure, switch to in-memory fallback and set `inmemoryFallback` to `true`. Verify the factory test passes (returns Storage object, `loading` starts true and becomes false after load, `inmemoryFallback` is true when IDB throws)
- [x] 2.4 Implement schema version check: on read, if `_version` is missing or higher than current schema version, return `null`. Verify the version mismatch test passes (writing version 999 then reading returns null)

## 3. Tests

- [x] 3.1 Create `src/lib/storage.test.ts` covering: first-visit returns null, config round-trip, partial update preserves other fields, unknown version returns null, fallback on IDB error, fallback flag transitions, session-only fallback does not persist across instances, loading state transitions. Verify `npx vitest run` passes all storage tests

## 4. Integration

- [x] 4.1 Wire storage into `App.svelte`: call `createStorage()`, await `load()`, render a loading indicator while `loading` is true, show config presence or "no config" when loaded. Verify `npx vitest run && npx tsc --noEmit` pass and the dev server shows the loading → result transition
