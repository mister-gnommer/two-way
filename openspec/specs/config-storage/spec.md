# config-storage Specification

## Purpose

Persists user configuration (provider settings, language pair) in IndexedDB so the app survives page reloads and embedded-iframe restarts, with graceful degradation when IDB is blocked by third-party storage restrictions.

## Requirements

### Requirement: Config is persisted across page loads
The storage layer SHALL write user configuration to IndexedDB and read it back on subsequent visits. The configuration SHALL include at minimum: provider base URL, provider model name, API key, and the active language pair (two languages, neither designated as source or target).

#### Scenario: First visit returns no config
- **WHEN** the storage layer is opened on a device/browser where no config has been saved
- **THEN** it SHALL return `null` (or equivalent empty signal) indicating no saved configuration exists

#### Scenario: Config round-trip
- **WHEN** a complete config is written and then read back (same session or later visit)
- **THEN** every field SHALL match what was written

#### Scenario: Partial update preserves other fields
- **WHEN** a subset of config fields is updated
- **THEN** all other previously saved fields SHALL remain unchanged in storage

### Requirement: Config load is asynchronous
The storage layer SHALL expose async read/write operations. Callers SHALL `await` the initial config load before deciding whether to show the setup modal.

#### Scenario: App awaits config before rendering
- **WHEN** the app calls the config load function
- **THEN** the function returns a Promise that resolves with the saved config or `null`

### Requirement: Storage degrades gracefully when IDB is unavailable
When IndexedDB is blocked or throws (e.g. third-party iframe in Safari, privacy-mode browsers), the storage layer SHALL fall back to a session-only in-memory store. The app SHALL NOT crash, loop the setup modal, or display an error to the user.

#### Scenario: IDB blocked — fallback to session store
- **WHEN** IndexedDB operations throw an error
- **THEN** the storage layer SHALL transparently switch to an in-memory store and the current session's writes/reads SHALL succeed

#### Scenario: Session store does not persist across reloads
- **WHEN** config is written while in session-only mode and the page is reloaded
- **THEN** the config load SHALL return `null` (as if first visit)

### Requirement: Storage exposes an in-memory fallback-active signal
The storage layer SHALL provide a reactive boolean signal indicating whether the in-memory fallback is active. This signal SHALL become `true` when the storage layer switches to fallback mode and remain `true` for the lifetime of that storage instance.

#### Scenario: In-memory fallback flag is false when IDB works
- **WHEN** IDB opens and reads successfully
- **THEN** the in-memory fallback signal SHALL remain `false`

#### Scenario: In-memory fallback flag becomes true on IDB failure
- **WHEN** IDB operations throw and the storage layer switches to in-memory fallback
- **THEN** the in-memory fallback signal SHALL become `true`

### Requirement: Storage uses a namespaced database
The IndexedDB database SHALL use the `two-way` name prefix to avoid collisions with other applications on the same origin.

#### Scenario: Database name is namespaced
- **WHEN** the storage layer opens the IDB database
- **THEN** the database name SHALL begin with `two-way`

### Requirement: Config schema is versioned
The storage layer SHALL store a schema version alongside config data so that future format changes can be migrated without data loss.

#### Scenario: Stored data includes a version marker
- **WHEN** config is written to IDB
- **THEN** the stored record SHALL include a version number

#### Scenario: Reading an unknown version returns null
- **WHEN** config is read and its stored version is unrecognized (e.g. from a future release)
- **THEN** the storage layer SHALL treat it as missing config (return `null`) rather than crash

### Requirement: Storage exposes a loading state signal
The storage layer SHALL provide a reactive loading-state value that consumers can use to render a loading indicator while config is being read from IDB.

#### Scenario: Loading state starts true and resolves
- **WHEN** the app initializes the storage layer
- **THEN** the loading signal SHALL start as `true` and become `false` once the initial config read completes (whether it resolves to config or `null`)
