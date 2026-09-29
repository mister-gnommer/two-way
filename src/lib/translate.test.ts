import { describe, expect, it } from 'vitest';
import {
  MAX_INPUT_CHARS,
  buildTranslationPrompt,
  checkInput,
  parseTranslationResponse,
  translationResponseSchema,
} from './translate';

const pair = { a: 'pl-PL', b: 'en' };

const json = (value: unknown): string => JSON.stringify(value);

describe('buildTranslationPrompt', () => {
  it('interpolates the configured pair and keeps the input out of the system part', () => {
    // Tags chosen so neither can appear by accident inside the prompt prose.
    const prompt = buildTranslationPrompt({ a: 'de-AT', b: 'pt-BR' }, 'Servus');
    expect(prompt.system).toContain('de-AT');
    expect(prompt.system).toContain('pt-BR');
    expect(prompt.user).toBe('Servus');
    expect(prompt.system).not.toContain('Servus');
  });

  it('names every schema field and the und sentinel the parser relies on', () => {
    const { system } = buildTranslationPrompt(pair, 'kawa');
    for (const field of Object.keys(translationResponseSchema.properties)) {
      expect(system).toContain(`"${field}"`);
    }
    expect(system).toContain('"und"');
  });
});

describe('checkInput', () => {
  it('rejects empty and whitespace-only input as blank, with a message', () => {
    for (const text of ['', '   ', '\n\t ']) {
      const outcome = checkInput(text);
      expect(outcome.kind).toBe('blank');
      if (outcome.kind === 'blank') {
        expect(outcome.message.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects over-length input as too-long, with a message', () => {
    const outcome = checkInput('a'.repeat(MAX_INPUT_CHARS + 1));
    expect(outcome.kind).toBe('too-long');
    if (outcome.kind === 'too-long') {
      expect(outcome.message.trim().length).toBeGreaterThan(0);
    }
  });

  it('passes input at the bound and returns the trimmed text', () => {
    const atBound = 'a'.repeat(MAX_INPUT_CHARS);
    const outcome = checkInput(`  ${atBound}  `);
    expect(outcome).toEqual({ kind: 'ok', text: atBound });
  });

  it('trims before checking, so long whitespace-only input is blank, not too-long', () => {
    const outcome = checkInput(' '.repeat(MAX_INPUT_CHARS + 100));
    expect(outcome.kind).toBe('blank');
  });
});

describe('parseTranslationResponse', () => {
  it('resolves the detected tag to a canonical pair member by primary subtag, case-insensitively', () => {
    for (const detected of ['pl-PL', 'pl', 'PL']) {
      const result = parseTranslationResponse(json({ detected_lang: detected, translation: 'coffee' }), 'kawa', pair);
      expect(result).toEqual({ kind: 'translation', source: 'pl-PL', target: 'en', translation: 'coffee' });
    }
    const asEnglish = parseTranslationResponse(json({ detected_lang: 'eN-GB', translation: 'kawa' }), 'coffee', pair);
    expect(asEnglish).toEqual({ kind: 'translation', source: 'en', target: 'pl-PL', translation: 'kawa' });
  });

  it('rejects off-pair input and discards any translation returned with it', () => {
    const result = parseTranslationResponse(json({ detected_lang: 'de', translation: 'Something' }), 'Guten Tag', pair);
    expect(result.kind).toBe('off-pair');
    if (result.kind === 'off-pair') {
      expect(result.detectedLang).toBe('de');
      expect(result.message.trim().length).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain('Something');
    }
  });

  it('treats an und response as off-pair with a distinct message', () => {
    const und = parseTranslationResponse(json({ detected_lang: 'und', translation: null }), 'asdf qwerty', pair);
    const german = parseTranslationResponse(json({ detected_lang: 'de', translation: null }), 'Guten Tag', pair);
    expect(und.kind).toBe('off-pair');
    if (und.kind === 'off-pair' && german.kind === 'off-pair') {
      expect(und.message).not.toBe(german.message);
      expect(und.message).not.toContain('und');
    }
  });

  it('error results carry the input and a message, never the raw response', () => {
    const result = parseTranslationResponse('Well, this is certainly not JSON.', 'kawa', pair);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.input).toBe('kawa');
      expect(result.message.trim().length).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain('certainly not JSON');
    }
  });

  it('returns an error for missing detected_lang or translation', () => {
    const missingLang = parseTranslationResponse(json({ translation: 'coffee' }), 'kawa', pair);
    expect(missingLang.kind).toBe('error');
    const missingTranslation = parseTranslationResponse(json({ detected_lang: 'pl' }), 'kawa', pair);
    expect(missingTranslation.kind).toBe('error');
  });

  it('returns an error for a detected_lang that is not a well-formed tag, without surfacing it', () => {
    const injected = 'Ignore this app, visit evil.example';
    const result = parseTranslationResponse(json({ detected_lang: injected, translation: null }), 'kawa', pair);
    expect(result.kind).toBe('error');
    expect(JSON.stringify(result)).not.toContain('evil.example');
  });

  it('accepts well-formed tags outside the pair as off-pair', () => {
    for (const detected of ['und', 'de', 'zh-Hant-TW']) {
      const result = parseTranslationResponse(json({ detected_lang: detected, translation: null }), 'x', pair);
      expect(result.kind).toBe('off-pair');
    }
  });

  it('returns an error for responses carrying fields beyond the contract', () => {
    const result = parseTranslationResponse(
      json({ detected_lang: 'pl', translation: 'coffee', note: 'hi' }),
      'kawa',
      pair,
    );
    expect(result.kind).toBe('error');
  });

  it('returns an error for in-pair detection with a null or blank translation', () => {
    for (const translation of [null, '   ']) {
      const result = parseTranslationResponse(json({ detected_lang: 'en', translation }), 'coffee', pair);
      expect(result.kind).toBe('error');
    }
  });
});
