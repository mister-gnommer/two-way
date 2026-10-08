## Context

See `proposal.md` (Why). The current state that shapes the approach:

- `src/lib/translate.ts` exports `checkInput`, `buildTranslationPrompt`,
  `parseTranslationResponse`, `translationResponseSchema`, and the `TranslationResult` /
  `GuardOutcome` unions. This change uses them as they are and does not edit them.
- `AppConfig.provider` holds `{ baseUrl, model, apiKey }`. The base URL is the API root
  (e.g. `https://api.openai.com/v1`), and validating it belongs to `setup`.
- Static-only rule: no backend and no proxy. The key never passes through a server of ours.
- Project rules: vitest for pure logic, the provider boundary is mocked, no network in
  unit tests, strict TS, no type assertions.

## Goals / Non-Goals

**Goals:**

- One entry point the UI awaits and `switch`es on, with no try/catch at the call site.
- Race-safety lives in `src/lib`, where it can be unit-tested, not in a Svelte component.
- Every network and HTTP outcome is covered by tests through an injected `fetch`.

**Non-Goals:**

- No provider-specific adapters (Anthropic native, Gemini native, Azure deployments).
  OpenAI-compatible only.
- No persistence of learned model quirks (the temperature memo is in-memory only).
- No UI, no config validation, no retries beyond the temperature case.

## Decisions

**D1: The translator is a latest-wins object that owns the AbortController.**
`createTranslator()` returns `{ translate(config, text), cancel() }`. Each `translate`
aborts the previous call's controller and creates a fresh one. *Why:* this is polisher's
AbortController race pattern, moved out of the component so it can be tested. The UI holds
one translator and never sees a controller. *Alternative:* the UI passes its own
`AbortSignal`. Rejected because every caller would have to reimplement latest-wins and
race tests would need a component.

**D2: The stale check runs after every `await`.** Once each awaited step settles
(`fetch`, body read, retry), the client checks `signal.aborted` and returns `aborted` if
it is set. *Why:* aborting makes a pending `fetch` reject, but a response that was already
received can still be read. This check is what guarantees a superseded call never
returns a parsed result.

**D3: The client runs the input guard.** `translate` calls `checkInput` first and returns
`blank` / `too-long` as they are. *Why:* the UI gets one call and one `switch`, and it is
impossible to send unguarded text. The UI can still call `checkInput` itself for
live validation, since the function is pure.

**D4: The result type is a union of existing shapes.**
`ProviderResult = TranslationResult | Exclude<GuardOutcome, { kind: 'ok' }> | { kind: 'aborted' }`.
Provider and network failures reuse `TranslationResult`'s `{ kind: 'error', message, input }`.
*Why:* this adds no parallel error type, and errors carry the input as the parser's errors
already do. `aborted` carries no data because the UI ignores it.

**D5: `fetch` and the timeout are injected.** The signature is
`createTranslator({ fetch?, timeoutMs? } = {})`, with defaults of
`(input, init) => globalThis.fetch(input, init)` and `30_000`. *Why:* tests pass a stub and
a small timeout without patching globals. The default is a wrapper because calling a
stored `fetch` reference as a method throws "Illegal invocation" in browsers.

**D6: One controller and one timer per translation.** The 30 s timer starts when
`translate` starts, covers the temperature retry, and is cleared in `finally`. When the
timer fires, it sets a local `timedOut` flag and then aborts. The post-await check (D2)
returns a timeout error if `timedOut` is set, and `aborted` otherwise. *Why:* this keeps
timeout and supersede apart without `AbortSignal.any` / `AbortSignal.timeout` and without
inspecting abort reasons, which avoids Safari version concerns in the iframe target.
*Alternative:* a separate budget for each attempt. Rejected because a retry could then
stretch a translation to 60 s.

**D7: The request is shaped as follows.**
`POST {baseUrl.replace(/\/+$/, '')}/chat/completions` with the body
`{ model, messages: [{ role: 'system', … }, { role: 'user', … }], temperature: 0.2,
response_format: { type: 'json_schema', json_schema: { name: 'translation', strict: true,
schema: translationResponseSchema } } }`. *Why:* this is the documented OpenAI
structured-outputs shape. The existing schema already meets strict-mode rules (all fields
required, `additionalProperties: false`, `type: ['string', 'null']`). `max_tokens` is not
sent because providers split on `max_tokens` vs `max_completion_tokens` and the input is
bounded at 500 chars anyway.

**D8: Fetch options keep ambient credentials out.** The headers are
`Authorization: Bearer <key>` and `Content-Type: application/json`, plus
`credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, and `cache: 'no-store'`. The module
has no `console.*` calls. *Why:* the key travels only where the user pointed it, and no
cookies or page URL leak to a third party. `mode` stays the default `cors`.

**D9: 400s are classified from the error body without surfacing it.** On a non-2xx
response, the client reads the body as text, tries `JSON.parse`, and narrows it to
`{ error: { param?, message? } }` with a type guard. For a 400:
- *temperature rejected* applies only when temperature was sent and either
  `param === 'temperature'` or `message` matches `/temperature/i`. The client retries once
  without it and records `baseUrl + model` in the memo (D10).
- *structured output rejected* applies when `param === 'response_format'` or `message`
  matches `/response_format|json_schema|structured output/i`. It returns a fixed
  "doesn't support structured output" error.
- Any other 400 returns a generic "request rejected (400)" error.

*Why:* OpenAI sets `param`, and other OpenAI-compatible providers often set only a
message, so both are checked. Matching on message text is a heuristic (see Risks). The
body is never put in a result because OpenAI's 401 body echoes a masked key, and provider
text is untrusted copy (same principle as translate-core D5).

**D10: The temperature memo is a per-translator `Set`.** It holds strings of the form
`${normalizedBaseUrl}\n${model}`, lives in the `createTranslator` closure, and is not
persisted. *Why:* without the memo, every translation on a reasoning model pays for two
round trips. Persisting it would change `AppConfig`/storage, which is out of scope, and
relearning once per page load is cheap.

**D11: Status classes map to fixed copy.** 401/403 means the key was rejected, 404 means
the base URL or model was not found, 429 means rate limited (try again shortly), 5xx means
the provider failed, any other status gets a generic message with the status code, and a
`fetch` rejection that is not an abort means the provider could not be reached (check the
base URL, the connection, and whether it allows browser requests (CORS)). *Why:* the
browser hides CORS failures behind the same `TypeError` as offline/DNS errors, so one
message names all likely causes. There are no automatic retries for 429/5xx, because the
user resubmits and retries would complicate the race logic.

**D12: The success path is defensive and does not use assertions.** The client reads the
body with `res.json()` inside try/catch, then narrows
`choices[0].message` with type guards. A non-null `refusal` gives a fixed "model declined"
error and the refusal text is not surfaced. Non-string `content` gives an error. Otherwise
`content` goes to `parseTranslationResponse(content, input, pair)` unchanged, with no
pre-trimming, so the strict-parser decision (translate-core D6) holds.

**D13: Tests use a `fetch` stub that records calls.** The stub returns `new Response(...)`
objects. Race tests use a deferred promise per call so the test controls resolution
order, and timeout tests use a small `timeoutMs` (or vitest fake timers). Assertions look
at the recorded `RequestInit` (URL, headers, parsed body) and the result, and never at
console output.

## Risks / Trade-offs

- [A provider blocks browser CORS] → The unreachable-error message names CORS. The
  static-only rule stands, and a proxy needs an explicit decision (AGENTS.md).
- [A provider words temperature or schema errors in a way the heuristic misses] → Missed
  temperature errors show a generic 400 error and missed schema errors show the same.
  Both are visible and fixable by adjusting the patterns. They are acceptable for beta
  because the main providers (OpenAI, OpenRouter, Groq) set `param` or name the field.
- [The heuristic misfires, e.g. a message that mentions "temperature" for another reason]
  → At worst there is one extra request without temperature, which is harmless.
- [The json_schema-only policy excludes models without structured output (some local or
  older models)] → This is deliberate. The error says so and setup's test call will
  surface it at configuration time.
- [The key sits in page memory and IDB] → This comes with BYOK and cannot be avoided in
  the browser. Mitigation is that the key is never logged, never put in URLs, and only
  sent to the user-chosen origin.
- [Refusal handling follows OpenAI's `message.refusal`] → Other providers that refuse in
  prose produce content that fails the strict parser, which is still an error and never a
  false translation.

## Open Questions

None.
