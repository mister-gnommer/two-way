import { describe, expect, it } from 'vitest';
import { chantView, isChant } from './cthulu';

describe('isChant', () => {
  it.each([
    "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
    "  PH’NGLUI  mglw'nafh cthulhu r'lyeh wgah’nagl FHTAGN!!",
    "ph‘nglui\tmglwʼnafh\ncthulhu r'lyeh wgah'nagl fhtagn…  ",
    "Ph'ngluimglw'nafhCthulhuR'lyehwgah'naglfhtagn",
  ])('recognises the full chant: %s', (input) => {
    expect(isChant(input)).toBe(true);
  });

  it.each([
    '',
    'fhtagn',
    "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl",
    "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn extra",
    "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagnx",
  ])('leaves other input for the provider: %s', (input) => {
    expect(isChant(input)).toBe(false);
  });
});

it('provides a copyable English translation with the accessible R’lyehian direction', () => {
  expect(chantView()).toEqual({
    kind: 'translation',
    text: "In his house at R'lyeh dead Cthulhu waits dreaming.",
    lang: 'en',
    direction: { text: "R'LYEHIAN → EN", name: "R'lyehian → English" },
    eldritch: true,
  });
});
