## 1. Module scaffold

- [x] 1.1 Create `src/lib/translate.ts` exporting the result union (`translation` | `off-pair` | `error`) and the guard outcomes (`ok` | `too-long` | `blank`); verify `npx tsc --noEmit` passes
- [x] 1.2 Export `translationResponseSchema` (both fields required, `additionalProperties: false`); verify parser tests reject a response missing a field and one carrying an extra field (the schema itself is consumed by `provider-client`)
- [x] 1.3 Export `MAX_INPUT_CHARS = 500`; verify the `checkInput` tests use `MAX_INPUT_CHARS` for the exact boundary (500 passes, 501 is too-long)

## 2. Prompt builder

- [x] 2.1 Implement `buildTranslationPrompt(pair, text)` returning `{ system, user }`; verify a test asserts both BCP-47 pair tags appear and the two parts are separate, using tags (`de-AT` / `pt-BR`) that cannot occur in the prompt prose by accident
- [x] 2.2 Encode the edge-case rules in the prompt — off-pair → detected tag with null translation, undetermined input → `und` with null translation, mixed input handled by provider best effort; prompt wording is not unit-tested — such tests only pin phrasing, not model behaviour (model-level testing: issue #2)
- [x] 2.3 Add the quality and contract directives — preserve tone/register and formatting, output only the translation, and state the JSON contract in prose; verify a test asserts the prompt names every `translationResponseSchema` field and the `"und"` sentinel
- [x] 2.4 Add the anti-injection clause; not unit-tested (wording only — see 2.2 and issue #2)

## 3. Input guard

- [x] 3.1 Implement `checkInput(text)` — trim, then `blank`, then `too-long`, with `ok` carrying the trimmed text — and a concise message per rejection; verify tests cover blank, too-long, and ok, including that `ok` returns the trimmed text and the trim-before-check ordering

## 4. Response parser

- [x] 4.1 Implement primary-subtag matching (case-insensitive); verify tests resolve `pl` to `pl-PL` and handle mixed-case tags
- [x] 4.2 Implement `parseTranslationResponse(raw, input, pair)` including contract validation (no fence unwrapping); verify a valid `{ detected_lang, translation }` parses into a translation result with canonical source and target; strict parsing (no fence unwrapping) is covered by the invalid-JSON error test
- [x] 4.3 Map a detection outside the pair to an off-pair result with a non-empty message and drop any returned translation; verify with German input against a `pl-PL` / `en` pair
- [x] 4.4 Return an error result (never throw) for invalid JSON and for missing `detected_lang` / `translation`; verify tests cover both
- [x] 4.5 Return an error for in-pair detection with a null or empty translation; verify a test covers it
- [x] 4.6 Verify an error result carries the input, a non-empty message, and never the raw response
- [x] 4.7 Ambiguous words (`gift`) resolve by detection alone — the parser never sees the input, so the 4.1 subtag tests cover the direction; no separate test
- [x] 4.8 Verify a response reporting `und` (with a null translation) produces an off-pair result, not an error, and that its message is distinct (e.g. "Couldn't detect the language") rather than built from the `und` tag
- [x] 4.9 Reject a `detected_lang` that is not a well-formed BCP-47 tag with an error result (D14); verify a free-text value (with spaces) yields an error that does not contain it, and that `und`, `pl`, and `en-GB` still pass

## 5. Mixed-language handling

- [x] 5.1 Mixed input is translated as one unit in the provider-determined direction — no dominance rule exists in our code, so this is a prompt rule (2.2), not a unit test

## 6. Verification and docs

- [x] 6.1 Run `npx vitest run && npx tsc --noEmit`; verify all tests pass and types are clean
- [x] 6.2 Update the Structure section of `AGENTS.md` to list `translate.ts` and `translate.test.ts`; verify the named files exist
