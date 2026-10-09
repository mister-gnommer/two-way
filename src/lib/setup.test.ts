import { describe, expect, it } from 'vitest';
import {
  LANGUAGES,
  SETUP_ERRORS,
  completeBaseUrl,
  languageOptions,
  validateSetup,
  type SetupForm,
} from './setup';

/** A form that passes every rule; each test breaks exactly what it checks. */
function validForm(overrides: Partial<SetupForm> = {}): SetupForm {
  return {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test123',
    langA: 'pl',
    langB: 'en',
    ...overrides,
  };
}

describe('validateSetup — required fields', () => {
  it('trims the values it saves', () => {
    const result = validateSetup(
      validForm({ baseUrl: '  https://api.openai.com/v1 ', model: '\tgpt-4o-mini ', apiKey: ' sk-abc ' }),
    );
    expect(result).toEqual({
      ok: true,
      config: {
        provider: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-abc' },
        pair: { a: 'pl', b: 'en' },
      },
    });
  });

  it('rejects an empty or whitespace-only base URL, reporting only that field', () => {
    for (const baseUrl of ['', '   ', '\n\t ']) {
      expect(validateSetup(validForm({ baseUrl }))).toEqual({
        ok: false,
        errors: { baseUrl: SETUP_ERRORS.baseUrlRequired },
      });
    }
  });

  it('rejects an empty or whitespace-only model, reporting only that field', () => {
    for (const model of ['', '   ']) {
      expect(validateSetup(validForm({ model }))).toEqual({
        ok: false,
        errors: { model: SETUP_ERRORS.modelRequired },
      });
    }
  });

  it('rejects an empty or whitespace-only key, reporting only that field', () => {
    for (const apiKey of ['', '   ']) {
      expect(validateSetup(validForm({ apiKey }))).toEqual({
        ok: false,
        errors: { apiKey: SETUP_ERRORS.apiKeyRequired },
      });
    }
  });
});

describe('validateSetup — base URL rule', () => {
  it('accepts https and loopback http URLs', () => {
    for (const baseUrl of [
      'https://api.openai.com/v1',
      'http://localhost:11434/v1',
      'http://127.0.0.1:1234/v1',
      'http://[::1]:8080/v1',
    ]) {
      expect(validateSetup(validForm({ baseUrl })).ok, baseUrl).toBe(true);
    }
  });

  it('rejects insecure, malformed, and decorated URLs with the matching message', () => {
    const rejected: Array<[string, string]> = [
      ['http://api.example.com/v1', SETUP_ERRORS.baseUrlHttps],
      ['not a url', SETUP_ERRORS.baseUrlInvalid],
      ['https://user:pw@host/v1', SETUP_ERRORS.baseUrlDecorated],
      ['https://host/v1?x=1', SETUP_ERRORS.baseUrlDecorated],
      ['https://host/v1#x', SETUP_ERRORS.baseUrlDecorated],
      ['https://host/v1?', SETUP_ERRORS.baseUrlDecorated],
      ['https://host/v1#', SETUP_ERRORS.baseUrlDecorated],
    ];
    for (const [baseUrl, message] of rejected) {
      expect(validateSetup(validForm({ baseUrl }))).toEqual({ ok: false, errors: { baseUrl: message } });
    }
  });

  it('prepends https:// when no scheme is given, loopback included', () => {
    const completed: Array<[string, string]> = [
      ['api.openai.com/v1', 'https://api.openai.com/v1'],
      ['  api.openai.com/v1 ', 'https://api.openai.com/v1'],
      ['localhost:11434/v1', 'https://localhost:11434/v1'],
      ['HTTPS://x.com/v1', 'HTTPS://x.com/v1'],
    ];
    for (const [typed, saved] of completed) {
      const result = validateSetup(validForm({ baseUrl: typed }));
      expect(result.ok, typed).toBe(true);
      if (result.ok) {
        expect(result.config.provider.baseUrl).toBe(saved);
      }
    }
  });

  it('never upgrades an explicit http:// to a remote host', () => {
    expect(completeBaseUrl('http://api.example.com/v1')).toBe('http://api.example.com/v1');
    expect(validateSetup(validForm({ baseUrl: 'http://api.example.com/v1' }))).toEqual({
      ok: false,
      errors: { baseUrl: SETUP_ERRORS.baseUrlHttps },
    });
  });

  it('leaves empty input empty so the required error still shows', () => {
    expect(completeBaseUrl('')).toBe('');
  });

  it('saves the trimmed URL as typed, not the normalized href', () => {
    const result = validateSetup(validForm({ baseUrl: '  https://api.OpenAI.com/v1/  ' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.provider.baseUrl).toBe('https://api.OpenAI.com/v1/');
    }
  });
});

describe('validateSetup — API key rule', () => {
  it('accepts a normal provider key', () => {
    expect(validateSetup(validForm({ apiKey: 'sk-abc123XYZ_-.=' })).ok).toBe(true);
  });

  it('rejects inner spaces, line breaks, smart quotes, and inner NBSPs', () => {
    for (const apiKey of ['sk-a b', 'sk-a\nb', 'sk-“abc”', 'sk-a\u00a0b']) {
      expect(validateSetup(validForm({ apiKey }))).toEqual({
        ok: false,
        errors: { apiKey: SETUP_ERRORS.apiKeyChars },
      });
    }
  });

  it('never echoes the key in the error message', () => {
    const result = validateSetup(validForm({ apiKey: 'sk-secret “value” 42' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.errors);
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('42');
      expect(serialized).not.toContain('value');
    }
  });
});

describe('language list and options', () => {
  it('lists tags unique in primary subtag, each canonical as-is', () => {
    const primaries = new Set(LANGUAGES.map((tag) => tag.split('-')[0].toLowerCase()));
    expect(primaries.size).toBe(LANGUAGES.length);
    for (const tag of LANGUAGES) {
      expect(Intl.getCanonicalLocales(tag)).toEqual([tag]);
    }
  });

  it('returns every listed tag: Polish and English first, the rest sorted by label', () => {
    const options = languageOptions([]);
    expect(options.map((option) => option.tag).sort()).toEqual([...LANGUAGES].sort());
    expect(options.slice(0, 2).map((option) => option.tag)).toEqual(['pl', 'en']);
    const restLabels = options.slice(2).map((option) => option.label);
    expect(restLabels).toEqual([...restLabels].sort((first, second) => first.localeCompare(second, 'en')));
  });

  it('sorts an unlisted saved tag among the unpinned languages', () => {
    const tags = languageOptions(['pl-PL']).map((option) => option.tag);
    expect(tags.slice(0, 2)).toEqual(['pl', 'en']);
    // "Polish (Poland)" sorts between "Norwegian" and "Portuguese".
    expect(tags.indexOf('pl-PL')).toBe(tags.indexOf('no') + 1);
    expect(tags.indexOf('pt')).toBe(tags.indexOf('pl-PL') + 1);
  });

  it('keeps an unlisted saved tag selectable, labelled when possible', () => {
    const options = languageOptions(['pl-PL', 'en']);
    const plPl = options.find((option) => option.tag === 'pl-PL');
    expect(plPl?.label).toBe('Polish (Poland)');
    expect(options.some((option) => option.tag === 'en')).toBe(true);
    // Not duplicated: 'pl' from the list and 'pl-PL' from storage coexist once each.
    expect(options.filter((option) => option.tag === 'pl-PL')).toHaveLength(1);
  });

  it('falls back to the tag itself as label when Intl rejects it', () => {
    const options = languageOptions(['!bad']);
    expect(options.find((option) => option.tag === '!bad')).toEqual({ tag: '!bad', label: '!bad' });
  });
});

describe('validateSetup — pair rules', () => {
  it('reports identical languages as a pair error', () => {
    expect(validateSetup(validForm({ langA: 'en', langB: 'en' }))).toEqual({
      ok: false,
      errors: { pair: SETUP_ERRORS.pairSame },
    });
  });

  it('reports a missing selection per field', () => {
    expect(validateSetup(validForm({ langA: '' }))).toEqual({
      ok: false,
      errors: { langA: SETUP_ERRORS.langARequired },
    });
    expect(validateSetup(validForm({ langB: '  ' }))).toEqual({
      ok: false,
      errors: { langB: SETUP_ERRORS.langBRequired },
    });
    expect(validateSetup(validForm({ langA: '', langB: '' }))).toEqual({
      ok: false,
      errors: { langA: SETUP_ERRORS.langARequired, langB: SETUP_ERRORS.langBRequired },
    });
  });

  it('accepts an unlisted saved tag as a pair member and keeps it unchanged', () => {
    const result = validateSetup(validForm({ langA: 'pl-PL', langB: 'en' }));
    expect(result).toEqual({
      ok: true,
      config: {
        provider: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-test123' },
        pair: { a: 'pl-PL', b: 'en' },
      },
    });
  });

  it('reports several invalid fields together', () => {
    const result = validateSetup(
      validForm({ baseUrl: 'http://api.example.com/v1', model: '', apiKey: 'sk-a b', langA: 'en', langB: 'en' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        baseUrl: SETUP_ERRORS.baseUrlHttps,
        model: SETUP_ERRORS.modelRequired,
        apiKey: SETUP_ERRORS.apiKeyChars,
        pair: SETUP_ERRORS.pairSame,
      });
    }
  });
});
