## 1. Module scaffold

- [ ] 1.1 Create `src/lib/provider.ts` exporting `ProviderResult` (D4), `Translator`, and `createTranslator({ fetch?, timeoutMs? })` (D5) with default `fetch` wrapper and 30 s timeout; verify `npx tsc --noEmit` passes

## 2. Request and guard

- [ ] 2.1 Run `checkInput` first and return `blank` / `too-long` without calling `fetch` (D3); verify tests assert the stub is never called for blank and over-length input
- [ ] 2.2 Build the request per D7/D8 — trailing-slash-stripped `{baseUrl}/chat/completions`, system + user messages from `buildTranslationPrompt`, `temperature: 0.2`, strict `json_schema` with `translationResponseSchema`, bearer header, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`; verify tests inspect the recorded URL, headers, init options, and parsed body, and that the URL never contains the key

## 3. Response handling

- [ ] 3.1 Read the 2xx body defensively (D12): narrow `choices[0].message` with type guards, map `refusal` and non-string content / unexpected shape / non-JSON body to errors, otherwise pass `content` to `parseTranslationResponse`; verify tests cover a valid reply (`pl` → `pl-PL`→`en`), refusal (text not surfaced), missing content, and a non-JSON body resolving rather than rejecting
- [ ] 3.2 Map failures to fixed copy (D11): 401/403, 404, 429, 5xx, other status, and `fetch` rejection (unreachable, mentions CORS); verify one test per class, each asserting the result is an error carrying the input and containing no provider body text — include a 401 body that echoes the key and assert the key is absent

## 4. 400 classification and temperature retry

- [ ] 4.1 Classify 400 bodies per D9; a structured-output rejection returns the "doesn't support structured output" error with no second request; verify tests cover `param: 'response_format'`, a message-only match, and an unclassified 400 → generic error
- [ ] 4.2 On a temperature rejection retry once without `temperature` and record `baseUrl + model` in the per-translator memo (D10); verify tests assert: the retry body lacks `temperature`, the result is the retry's outcome, a failing retry yields its error with exactly two calls total, and a subsequent `translate` on the same translator/base URL/model sends no `temperature` on the first call while a different model still does

## 5. Cancellation and timeout

- [ ] 5.1 Implement latest-wins (D1) with the post-await stale check (D2) and `cancel()`; verify with deferred stub responses that a superseded call resolves `aborted`, its signal is aborted, a late response resolved after supersede is not parsed (still `aborted`), and `cancel()` resolves the in-flight call as `aborted`
- [ ] 5.2 Implement the per-translation timer covering the retry (D6); verify with a small `timeoutMs` (or fake timers) that a hanging stub yields the timeout error (not `aborted`) and that the timer does not fire after a completed translation

## 6. Integration checks and docs

- [ ] 6.1 Verify no outcome can carry the key: a test runs every error path with key `sk-test-secret` and asserts no result serializes it; `grep -n "console\." src/lib/provider.ts` returns nothing
- [ ] 6.2 Run `npx vitest run && npx tsc --noEmit`; verify all tests pass and types are clean
- [ ] 6.3 Update `AGENTS.md` Structure: mark `provider.ts` as implemented (drop *planned*) and add `provider.test.ts`; verify the listed files exist
- [ ] 6.4 Manual smoke (user-run, needs a real key): in `astro dev`, import `/src/lib/provider.ts` from the browser console and translate one word against a real provider, top-level and inside a plain iframe; verify a translation result comes back and the Network tab shows no cookies/referrer on the request

## Workflow follow-up

- Propose a commit after planning, after apply, and after archive (three commits).
- Archive the change once tasks are complete and the user has reviewed the spec.
