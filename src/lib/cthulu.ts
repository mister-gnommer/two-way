import type { ResultView } from './translate-view';

const CHANT = "ph'nglui mglw'nafh cthulhu r'lyeh wgah'nagl fhtagn";

/** Recognises the complete chant despite apostrophe, spacing and trailing punctuation variations. */
export function isChant(input: string): boolean {
  const normalized = input
    .toLowerCase()
    .replace(/[’‘ʼ]/gu, "'")
    .replace(/\s+/gu, '')
    .replace(/[.!?…]+$/u, '');
  return normalized === CHANT.replaceAll(' ', '');
}

export function chantView(): ResultView {
  return {
    kind: 'translation',
    text: "In his house at R'lyeh dead Cthulhu waits dreaming.",
    lang: 'en',
    direction: { text: "R'LYEHIAN → EN", name: "R'lyehian → English" },
    eldritch: true,
  };
}
