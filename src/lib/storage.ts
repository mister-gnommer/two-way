import { writable, type Writable } from 'svelte/store';
import type { AppConfig, StoredRecord } from './types';

const DB_NAME = 'two-way-config';
const DB_VERSION = 1;
const STORE_NAME = 'config';
const RECORD_KEY = 'current';
const SCHEMA_VERSION = 1;

/**
 * Config persistence over IndexedDB, with a session-only in-memory fallback
 * for contexts where IDB is blocked (e.g. third-party iframes in Safari).
 */
export interface Storage {
  /** Starts `true`, becomes `false` once the initial `load()` settles (config or `null`). */
  readonly loading: Writable<boolean>;
  /** `true` for the instance lifetime once any IDB failure switched storage to memory-only. */
  readonly inmemoryFallback: Writable<boolean>;
  /** Reads the saved config; resolves `null` when none exists (or is unreadable). Never rejects. */
  load(): Promise<AppConfig | null>;
  /** Persists the config; falls back to memory (never rejects) when IDB throws. */
  save(config: AppConfig): Promise<void>;
}

/** @internal Exported for unit tests only; use `createStorage()` instead. */
export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProvider(value: unknown): value is AppConfig['provider'] {
  return (
    isRecord(value) &&
    typeof value.baseUrl === 'string' &&
    typeof value.model === 'string' &&
    typeof value.apiKey === 'string'
  );
}

function isPair(value: unknown): value is AppConfig['pair'] {
  return isRecord(value) && typeof value.a === 'string' && typeof value.b === 'string';
}

/** Version guard: a record is readable only if its `_version` exists and is not from the future. */
function isStoredRecord(value: unknown): value is StoredRecord {
  return (
    isRecord(value) &&
    typeof value._version === 'number' &&
    value._version <= SCHEMA_VERSION &&
    isProvider(value.provider) &&
    isPair(value.pair)
  );
}

/**
 * Validates a raw IDB value as a StoredRecord the current schema version can read.
 * A missing record (first visit) returns null silently; a present-but-unreadable
 * one (unknown version, corrupted shape) also returns null but warns — so a
 * future version or tampered storage is visible in the console, not a silent
 * "no config" that looks like a first visit.
 */
function toStoredRecord(value: unknown): StoredRecord | null {
  if (!isStoredRecord(value)) {
    if (value !== undefined) {
      const version = isRecord(value) && typeof value._version === 'number' ? value._version : 'missing';
      console.warn(`two-way: stored config is unreadable (_version: ${version}), treating as missing`);
    }
    return null;
  }
  return {
    _version: value._version,
    provider: { ...value.provider },
    pair: { ...value.pair },
  };
}

/** @internal Exported for unit tests only; use `createStorage()` instead. */
export function readConfig(db: IDBDatabase): Promise<StoredRecord | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve(toStoredRecord(request.result));
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** @internal Exported for unit tests only; use `createStorage()` instead. */
export function writeConfig(db: IDBDatabase, record: StoredRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...record, id: RECORD_KEY });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function toConfig(record: StoredRecord): AppConfig {
  return {
    provider: { ...record.provider },
    pair: { ...record.pair },
  };
}

/**
 * Creates an independent storage instance. Call `load()` once during component
 * mount and await it before deciding whether to show the setup modal; bind the
 * `loading`/`inmemoryFallback` signals for UI state.
 */
export function createStorage(): Storage {
  const loading = writable(true);
  const inmemoryFallback = writable(false);
  let memoryStore: Map<string, StoredRecord> | null = null;
  let dbPromise: Promise<IDBDatabase> | null = null;

  function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDb();
    }
    return dbPromise;
  }

  function enterFallback(): Map<string, StoredRecord> {
    inmemoryFallback.set(true);
    if (!memoryStore) {
      memoryStore = new Map();
    }
    return memoryStore;
  }

  async function load(): Promise<AppConfig | null> {
    try {
      const db = await getDb();
      const record = await readConfig(db);
      loading.set(false);
      if (!record) {
        return null;
      }
      return toConfig(record);
    } catch (error) {
      console.warn('two-way: IndexedDB unavailable, using in-memory session storage', error);
      const store = enterFallback();
      loading.set(false);
      const record = store.get(RECORD_KEY);
      if (!record) {
        return null;
      }
      return toConfig(record);
    }
  }

  async function save(config: AppConfig): Promise<void> {
    const record: StoredRecord = { ...config, _version: SCHEMA_VERSION };
    if (memoryStore) {
      memoryStore.set(RECORD_KEY, record);
      return;
    }
    try {
      const db = await getDb();
      await writeConfig(db, record);
    } catch (error) {
      console.warn('two-way: IndexedDB write failed, switching to in-memory session storage', error);
      enterFallback().set(RECORD_KEY, record);
    }
  }

  return { loading, inmemoryFallback, load, save };
}
