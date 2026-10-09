import { describe, expect, it } from 'vitest';
import { directionLabel, pairLabel, resultView, shortTag } from './translate-view';

describe('language labels', () => {
  it('shortens a regional tag to its uppercased primary subtag', () => {
    expect(shortTag('pl-PL')).toBe('PL');
  });

  it('labels the pair without a direction', () => {
    expect(pairLabel({ a: 'pl', b: 'en' })).toEqual({ text: 'PL ↔ EN', name: 'Polish ↔ English' });
  });

  it('labels a direction from source to target, naming the regional member in full', () => {
    expect(directionLabel('pl-PL', 'en')).toEqual({ text: 'PL → EN', name: 'Polish (Poland) → English' });
  });
});

describe('resultView', () => {
  it('shows a translation with its target language and direction', () => {
    expect(resultView({ kind: 'translation', source: 'en', target: 'pl', translation: 'kawa' })).toEqual({
      kind: 'translation',
      text: 'kawa',
      lang: 'pl',
      direction: { text: 'EN → PL', name: 'English → Polish' },
    });
  });

  it('shows off-pair and guard rejections as neutral notices', () => {
    expect(resultView({ kind: 'off-pair', detectedLang: 'de', message: 'Not in the pair.' })).toEqual({
      kind: 'notice',
      message: 'Not in the pair.',
    });
    expect(resultView({ kind: 'blank', message: 'Enter some text.' })).toEqual({
      kind: 'notice',
      message: 'Enter some text.',
    });
    expect(resultView({ kind: 'too-long', message: 'Too long.' })).toEqual({ kind: 'notice', message: 'Too long.' });
  });

  it('shows provider failures as errors', () => {
    expect(resultView({ kind: 'error', message: 'Key rejected.', input: 'kawa' })).toEqual({
      kind: 'error',
      message: 'Key rejected.',
    });
  });

  it('leaves the shown view alone for an aborted call', () => {
    expect(resultView({ kind: 'aborted' })).toBeNull();
  });
});
