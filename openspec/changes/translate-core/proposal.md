## Why

The app has storage but no translation logic. `src/lib/translate.ts` is still a planned
stub, so nothing defines the prompt sent to the provider or how its response is read
back. This is the core of the product and a stated learning goal (structured output /
JSON-schema mode), so it must exist — as pure, testable functions — before any UI or
provider call is built on top of it.

## What Changes

- Add `src/lib/translate.ts` — pure functions for the translation contract:
  - `buildTranslationPrompt(pair, text)` — returns a `{ system, user }` prompt. The system
    part states the pair as BCP-47 tags and instructs the model to detect the input
    language, translate into the other language, preserve tone/register and formatting,
    output only the translation, treat the input as data rather than instructions
    (anti-injection), and state the JSON contract in prose.
  - `parseTranslationResponse(raw, input, pair)` — parses the provider's JSON into a
    discriminated result: a translation, an off-pair rejection, or an error. The error
    carries the original `input`; the raw response is never retained.
  - `checkInput(text)` — a guard returning `ok | too-long | blank`; the `ok` outcome carries
    the trimmed text. `MAX_INPUT_CHARS = 500` bounds the input, and core trims before
    checking.
  - `translationResponseSchema` — the `{ detected_lang, translation }` JSON-schema
    contract, consumed by the provider call (next change) rather than hand-built there.
- Define detection edge cases explicitly (agreed behaviour):
  - **Off-pair input** (neither language of the pair) → rejected with a message, no
    translation; any translation the model also returned is discarded.
  - **Undetectable input** (gibberish, emoji) → the prompt asks the provider to report
    `und`; it is treated as off-pair, with no separate outcome.
  - **Mixed-language input** → no dominance rule; the provider picks the most likely
    intended language and the whole string is translated into the other pair language.
  - **Ambiguous words** (valid in both pair languages) → detection decides; the returned
    direction is surfaced by the UI (built later).
  - **In-pair detection with no translation** → an error, since a pair-language input must
    produce a translation.
- Languages are **BCP-47 tags** (e.g. `pl-PL`, `en`). Detection matches on the primary
  language subtag so `pl` and `pl-PL` resolve to the same direction.
- Vitest coverage for the prompt builder, the parser, the input guard, and the
  detection/pair edge cases above.

## Capabilities

### New Capabilities

- `translation`: The translation contract — prompt construction, language detection
  within the configured BCP-47 pair, off-pair rejection, bounded input, and parsing of the
  structured `{ detected_lang, translation }` response.

### Modified Capabilities

None.

## Impact

- **New file**: `src/lib/translate.ts`
- **New test file**: `src/lib/translate.test.ts`
- **Public API**: `buildTranslationPrompt`, `parseTranslationResponse`, `checkInput`,
  `translationResponseSchema`, `MAX_INPUT_CHARS`, plus the result and guard types.
- **Consumes**: `AppConfig['pair']` from `src/lib/types.ts` (`{ a, b }` BCP-47 tags).
- **Feeds**: the upcoming `provider-client` change (uses the prompt + schema) and the
  `translate-ui` change (renders the parsed result). Neither is built here.
- **Deferred**: validation that pair members differ in their primary subtag belongs to
  `setup`, not here.
- **No dependency changes** and no UI in this change — pure functions only.
