## 1. Module scaffold

- [ ] 1.1 Create `src/lib/translate.ts` exporting the result union (`translation` | `off-pair` | `error`) and the guard outcomes (`ok` | `too-long` | `blank`); verify `npx tsc --noEmit` passes
- [ ] 1.2 Export `translationResponseSchema` (both fields required, `additionalProperties: false`); verify a test asserts both requirements and the no-extra-properties rule
- [ ] 1.3 Export `MAX_INPUT_CHARS = 500`; verify a test asserts the value

## 2. Prompt builder

- [ ] 2.1 Implement `buildTranslationPrompt(pair, text)` returning `{ system, user }`; verify a test asserts both BCP-47 pair tags appear and the two parts are separate
- [ ] 2.2 Encode the edge-case rules in the prompt — off-pair → detected tag with null translation, undetermined input → `und` with null translation, mixed input handled by provider best effort; verify a test asserts each instruction is present
- [ ] 2.3 Add the quality and contract directives — preserve tone/register and formatting, output only the translation, and state the JSON contract in prose; verify a test asserts each directive is present
- [ ] 2.4 Add the anti-injection clause; verify a test asserts the prompt treats the user part as data and ignores embedded instructions

## 3. Input guard

- [ ] 3.1 Implement `checkInput(text)` — trim, then `blank`, then `too-long`, with `ok` carrying the trimmed text — and a concise message per rejection; verify tests cover blank, too-long, and ok, including that `ok` returns the trimmed text and the trim-before-check ordering

## 4. Response parser

- [ ] 4.1 Implement primary-subtag matching (case-insensitive); verify tests resolve `pl` to `pl-PL` and handle mixed-case tags
- [ ] 4.2 Implement `parseTranslationResponse(raw, input)` including single-fence unwrapping and contract validation; verify a valid `{ detected_lang, translation }` parses into a translation result with canonical source and target, and that a fenced valid response parses identically
- [ ] 4.3 Map a detection outside the pair to an off-pair result with a non-empty message and drop any returned translation; verify with German input against a `pl-PL` / `en` pair
- [ ] 4.4 Return an error result (never throw) for invalid JSON and for missing `detected_lang` / `translation`; verify tests cover both
- [ ] 4.5 Return an error for in-pair detection with a null or empty translation; verify a test covers it
- [ ] 4.6 Verify an error result carries the input, a non-empty message, and never the raw response
- [ ] 4.7 Verify an ambiguous word (`gift`) resolves to a translation, not a rejection
- [ ] 4.8 Verify a response reporting `und` (with a null translation) produces an off-pair result, not an error, and that its message is distinct (e.g. "Couldn't detect the language") rather than built from the `und` tag

## 5. Mixed-language handling

- [ ] 5.1 Verify a mixed-input response translates the whole string as one unit, with the direction determined by the provider (no dominance rule in our code)

## 6. Verification and docs

- [ ] 6.1 Run `npx vitest run && npx tsc --noEmit`; verify all tests pass and types are clean
- [ ] 6.2 Update the Structure section of `AGENTS.md` to list `translate.ts` and `translate.test.ts`; verify the named files exist
