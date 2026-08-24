/** App configuration persisted in IndexedDB. All fields required — absence means no config. */
export interface AppConfig {
  provider: {
    baseUrl: string;
    model: string;
    apiKey: string;
  };
  /** The two languages of the active pair. Unordered: `a`/`b` imply no direction — detection decides at runtime. */
  pair: {
    a: string;
    b: string;
  };
}

/** AppConfig as stored on disk, tagged with the schema version it was written under. */
export interface StoredRecord extends AppConfig {
  _version: number;
}
