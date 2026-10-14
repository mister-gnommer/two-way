import type { ProviderResult } from './provider';
import { languageLabel } from './setup';
import type { AppConfig } from './types';

/** A compact label to show (`PL → EN`) with the full name for tooltips and screen readers. */
export interface LanguageLabel {
  text: string;
  name: string;
}

/** What the panel's result area shows; `idle` and `translating` are set by the panel itself. */
export type ResultView =
  | { kind: 'idle' }
  | { kind: 'translating' }
  | { kind: 'translation'; text: string; lang: string; direction: LanguageLabel; eldritch?: boolean }
  | { kind: 'notice'; message: string }
  | { kind: 'error'; message: string };

/**
 * Uppercased primary language subtag for compact display: `pl-PL` → `PL`.
 * @param tag a BCP-47 language tag
 */
export function shortTag(tag: string): string {
  return tag.split('-')[0].toUpperCase();
}

/**
 * Label for the configured pair, which has no direction: `PL ↔ EN`.
 * @param pair the configured language pair
 */
export function pairLabel(pair: AppConfig['pair']): LanguageLabel {
  return {
    text: `${shortTag(pair.a)} ↔ ${shortTag(pair.b)}`,
    name: `${languageLabel(pair.a)} ↔ ${languageLabel(pair.b)}`,
  };
}

/**
 * Label for the direction a translation went: `PL → EN`.
 * @param source the pair member the input was detected as
 * @param target the pair member it was translated into
 */
export function directionLabel(source: string, target: string): LanguageLabel {
  return {
    text: `${shortTag(source)} → ${shortTag(target)}`,
    name: `${languageLabel(source)} → ${languageLabel(target)}`,
  };
}

/**
 * Maps a translation outcome to what the result area shows. Off-pair and guard rejections
 * are neutral notices, not errors.
 * @param outcome the resolved translation call
 * @returns the view to show, or null for `aborted`: a superseded or cancelled call must
 * leave the current view alone
 */
export function resultView(outcome: ProviderResult): ResultView | null {
  switch (outcome.kind) {
    case 'translation':
      return {
        kind: 'translation',
        text: outcome.translation,
        lang: outcome.target,
        direction: directionLabel(outcome.source, outcome.target),
      };
    case 'off-pair':
    case 'blank':
    case 'too-long':
      return { kind: 'notice', message: outcome.message };
    case 'error':
      return { kind: 'error', message: outcome.message };
    case 'aborted':
      return null;
  }
}
