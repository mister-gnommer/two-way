import type { AppConfig } from './types';

/** Raw setup form contents, exactly as the user typed or selected them. */
export interface SetupForm {
  baseUrl: string;
  model: string;
  apiKey: string;
  langA: string;
  langB: string;
}

/**
 * Per-field validation errors; only failing fields are present.
 * `pair` concerns both language selects at once (identical selection).
 */
export interface SetupErrors {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  langA?: string;
  langB?: string;
  pair?: string;
}

/** Outcome of validating the setup form: the trimmed config to save, or per-field errors. */
export type SetupValidation = { ok: true; config: AppConfig } | { ok: false; errors: SetupErrors };

/** Fixed per-field error copy. The key messages never interpolate the key itself. */
export const SETUP_ERRORS = {
  baseUrlRequired: 'Enter the base URL of your provider.',
  baseUrlInvalid: 'Enter a full URL, like https://api.openai.com/v1.',
  baseUrlHttps: 'Use https:// — plain http:// is allowed only for localhost, 127.0.0.1, and [::1].',
  baseUrlDecorated: 'The base URL must not contain credentials, a query, or a fragment.',
  modelRequired: 'Enter the model name.',
  apiKeyRequired: 'Enter your API key.',
  apiKeyChars: 'The key contains characters providers cannot use — check for spaces, line breaks, or smart quotes.',
  langARequired: 'Choose the first language.',
  langBRequired: 'Choose the second language.',
  pairSame: 'The two languages must be different.',
};

/**
 * Curated selectable languages as primary-language BCP-47 tags. No two entries share a
 * primary subtag, so any two different selections differ in primary subtag by construction.
 */
export const LANGUAGES: readonly string[] = [
  'ar', 'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi',
  'fr', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'lt',
  'lv', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sr',
  'sv', 'th', 'tr', 'uk', 'vi', 'zh',
];

/** Languages listed first in both selects, in this order; all are also in `LANGUAGES`. */
const PINNED_LANGUAGES: readonly string[] = ['pl', 'en'];

/** First-run prefills for the provider fields; a saved config always takes precedence. */
export const DEFAULT_PROVIDER = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

/** One entry of the language selects. */
export interface LanguageOption {
  tag: string;
  label: string;
}

const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });

/** Hosts allowed to serve plain http: their traffic never leaves the machine. */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Visible ASCII (U+0021–U+007E); catches pasted whitespace, line breaks, and smart quotes. */
const VISIBLE_ASCII = /^[\x21-\x7E]+$/;

/**
 * Human-readable English label for a BCP-47 tag; falls back to the tag itself when
 * `Intl.DisplayNames` has no name for it or rejects it as malformed.
 * @param tag a BCP-47 language tag
 */
function labelFor(tag: string): string {
  try {
    return displayNames.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * Builds the language select options: the curated list plus any saved tags missing from it,
 * so a reopened form never loses an unlisted pair member (e.g. a stored `pl-PL`).
 * @param saved the tags currently stored in the config, if any
 * @returns the pinned languages first, then the rest sorted by their English label
 */
export function languageOptions(saved: readonly string[]): LanguageOption[] {
  const tags = new Set(LANGUAGES);
  for (const tag of saved) {
    if (tag.length > 0) {
      tags.add(tag);
    }
  }
  const rest = [...tags]
    .filter((tag) => !PINNED_LANGUAGES.includes(tag))
    .map((tag) => ({ tag, label: labelFor(tag) }))
    .sort((first, second) => first.label.localeCompare(second.label, 'en'));
  return [...PINNED_LANGUAGES.map((tag) => ({ tag, label: labelFor(tag) })), ...rest];
}

/** A leading `scheme://`. Matched on `://` because `new URL('localhost:11434')` parses `localhost:` as a scheme. */
const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Prepends `https://` to a trimmed base URL typed without a scheme; empty input and URLs
 * that already carry a scheme (including an explicit `http://`) are returned unchanged.
 * @param baseUrl the trimmed base URL as typed
 */
export function completeBaseUrl(baseUrl: string): string {
  if (baseUrl.length === 0 || SCHEME_PREFIX.test(baseUrl)) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
}

/**
 * Validates the trimmed base URL: an absolute URL over https (http only for loopback
 * hosts), without credentials, query, or fragment — the provider appends
 * `/chat/completions`, which must not land inside a query or fragment.
 * @param baseUrl the trimmed URL as typed
 * @returns the fixed error message, or null when valid
 */
function baseUrlError(baseUrl: string): string | null {
  if (baseUrl.length === 0) {
    return SETUP_ERRORS.baseUrlRequired;
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return SETUP_ERRORS.baseUrlInvalid;
  }
  const loopbackHttp = url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !loopbackHttp) {
    return SETUP_ERRORS.baseUrlHttps;
  }
  // `URL` reports a bare `?` or `#` as an empty search/hash, but the provider appends to the string as typed.
  const hasQueryOrFragment = baseUrl.includes('?') || baseUrl.includes('#');
  if (url.username !== '' || url.password !== '' || hasQueryOrFragment) {
    return SETUP_ERRORS.baseUrlDecorated;
  }
  return null;
}

/**
 * Validates the trimmed API key: required and visible ASCII only. Both messages are
 * fixed copy and never contain the key.
 * @param apiKey the trimmed key as typed
 * @returns the fixed error message, or null when valid
 */
function apiKeyError(apiKey: string): string | null {
  if (apiKey.length === 0) {
    return SETUP_ERRORS.apiKeyRequired;
  }
  if (!VISIBLE_ASCII.test(apiKey)) {
    return SETUP_ERRORS.apiKeyChars;
  }
  return null;
}

/**
 * Validates the raw setup form: trims every field, applies the provider and pair rules,
 * and reports all failing fields at once. The base URL is kept as typed (trimmed, with
 * `https://` prepended when no scheme was given), not as `URL.href`, so the user sees what
 * they entered.
 * @param form the raw form contents
 * @returns the trimmed config when valid, otherwise per-field errors
 */
export function validateSetup(form: SetupForm): SetupValidation {
  const baseUrl = completeBaseUrl(form.baseUrl.trim());
  const model = form.model.trim();
  const apiKey = form.apiKey.trim();
  const langA = form.langA.trim();
  const langB = form.langB.trim();

  const errors: SetupErrors = {};
  const urlProblem = baseUrlError(baseUrl);
  if (urlProblem !== null) {
    errors.baseUrl = urlProblem;
  }
  if (model.length === 0) {
    errors.model = SETUP_ERRORS.modelRequired;
  }
  const keyProblem = apiKeyError(apiKey);
  if (keyProblem !== null) {
    errors.apiKey = keyProblem;
  }
  if (langA.length === 0) {
    errors.langA = SETUP_ERRORS.langARequired;
  }
  if (langB.length === 0) {
    errors.langB = SETUP_ERRORS.langBRequired;
  }
  if (langA.length > 0 && langB.length > 0 && langA === langB) {
    errors.pair = SETUP_ERRORS.pairSame;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    config: { provider: { baseUrl, model, apiKey }, pair: { a: langA, b: langB } },
  };
}
