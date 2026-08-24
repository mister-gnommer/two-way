import { IDBFactory } from 'fake-indexeddb';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorage, openDb, readConfig, writeConfig } from './storage';
import type { AppConfig } from './types';

const fullConfig: AppConfig = {
  provider: { baseUrl: 'https://api.example.com/v1', model: 'gpt-mini', apiKey: 'sk-test' },
  pair: { a: 'pl', b: 'en' },
};

const blockedIdb = {
  open: () => {
    throw new Error('blocked');
  },
};

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('returns null on first visit', async () => {
    const storage = createStorage();
    expect(await storage.load()).toBeNull();
  });

  it('IDB helpers round-trip a versioned record', async () => {
    const db = await openDb();
    await writeConfig(db, { ...fullConfig, _version: 1 });
    const record = await readConfig(db);
    db.close();
    expect(record).toEqual({ ...fullConfig, _version: 1 });
  });

  it('round-trips config across storage instances', async () => {
    const storage = createStorage();
    await storage.save(fullConfig);
    const later = createStorage();
    expect(await later.load()).toEqual(fullConfig);
  });

  it('partial update preserves other fields', async () => {
    const storage = createStorage();
    await storage.save(fullConfig);
    await storage.save({ ...fullConfig, pair: { ...fullConfig.pair, b: 'de' } });
    const loaded = await createStorage().load();
    expect(loaded?.pair).toEqual({ a: 'pl', b: 'de' });
    expect(loaded?.provider).toEqual(fullConfig.provider);
  });

  it('returns null for unknown schema version', async () => {
    const db = await openDb();
    await writeConfig(db, { ...fullConfig, _version: 999 });
    db.close();
    expect(await createStorage().load()).toBeNull();
  });

  it('returns null for malformed stored record', async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('config', 'readwrite');
      tx.objectStore('config').put({ id: 'current', _version: 1, provider: { baseUrl: 123 } });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    expect(await createStorage().load()).toBeNull();
  });

  it('falls back to in-memory store when IDB throws on open', async () => {
    vi.stubGlobal('indexedDB', blockedIdb);
    const storage = createStorage();
    await storage.load();
    await storage.save(fullConfig);
    expect(await storage.load()).toEqual(fullConfig);
    expect(get(storage.inmemoryFallback)).toBe(true);
  });

  it('save falls back when IDB throws before load', async () => {
    vi.stubGlobal('indexedDB', blockedIdb);
    const storage = createStorage();
    await storage.save(fullConfig);
    expect(get(storage.inmemoryFallback)).toBe(true);
    expect(await storage.load()).toEqual(fullConfig);
  });

  it('in-memory fallback does not persist across instances', async () => {
    vi.stubGlobal('indexedDB', blockedIdb);
    const first = createStorage();
    await first.load();
    await first.save(fullConfig);
    expect(await createStorage().load()).toBeNull();
  });

  it('inmemoryFallback stays false when IDB works', async () => {
    const storage = createStorage();
    await storage.load();
    expect(get(storage.inmemoryFallback)).toBe(false);
  });

  it('loading starts true and becomes false after load', async () => {
    const storage = createStorage();
    const seen: boolean[] = [];
    const unsubscribe = storage.loading.subscribe((value) => seen.push(value));
    await storage.load();
    unsubscribe();
    expect(seen[0]).toBe(true);
    expect(seen.at(-1)).toBe(false);
  });

  it('loading becomes false even when IDB throws', async () => {
    vi.stubGlobal('indexedDB', blockedIdb);
    const storage = createStorage();
    await storage.load();
    expect(get(storage.loading)).toBe(false);
  });
});
