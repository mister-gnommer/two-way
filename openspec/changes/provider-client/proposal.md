## Why

`translate-core` defines the prompt, the response schema, and the parser, but nothing sends
a request. The app needs a browser-side client that calls the user's OpenAI-compatible
provider directly, with no backend. This is the one change that handles the API key and
crosses the network. CORS, abort/race handling, and the provider's error responses are
all decided here, so they get pinned down before `setup-modal` and `translate-ui` build
on top.

## What Changes

- Add `src/lib/provider.ts`, a browser-side client for OpenAI-compatible Chat Completions:
  - `createTranslator(options?)` returns a translator with `translate(config, text)` and
    `cancel()`. Starting a new translation aborts the one in flight (latest wins), and the
    superseded call resolves as `aborted`, so a stale response can never overwrite a
    newer one.
  - `translate` runs the `checkInput` guard first, so blank or too-long input never
    reaches the network. It builds the prompt with `buildTranslationPrompt` and parses the
    reply with `parseTranslationResponse`.
  - One request = `POST {baseUrl}/chat/completions` with the system and user messages,
    `temperature: 0.2`, and strict `response_format: json_schema` built from
    `translationResponseSchema`.
- **Structured output is mandatory.** The client always sends json_schema and has no
  json_object or prose fallback. A provider or model that rejects it gets a clear
  "model doesn't support structured output" error.
- **Temperature retry.** When a model rejects `temperature` (reasoning models only accept
  the default), the client retries once without it. It then remembers that for the
  translator's lifetime for this base URL + model, so later requests skip the failed
  first attempt.
- **Never throws.** Every outcome is a returned value: translation, off-pair, guard
  rejection, error, or aborted. Error results keep the original input so the UI never
  loses it.
- **Status-mapped errors.** 401/403 (key), 404 (base URL / model), 429 (rate limit),
  5xx (provider down), network failure (unreachable or CORS-blocked), timeout, refusal,
  and malformed reply each get a fixed message written by us. Provider error bodies are
  read only to classify the error and are never shown to the user, because some providers
  echo part of the key in them.
- **API key hygiene.** The key goes only in the `Authorization` header to the configured
  base URL. It never appears in URLs, results, messages, or logs. Requests send no
  cookies and no referrer.
- **Timeout**: 30 s per request, reported as an error (not as `aborted`).
- Vitest coverage with an injected `fetch` stub and no network calls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `translation`: adds the provider call. It covers the request shape and structured
  output, the temperature retry, latest-wins cancellation, the timeout, error mapping,
  and API key handling. The existing prompt, guard, and parser requirements are
  unchanged.

## Impact

- **New file**: `src/lib/provider.ts` (listed as *planned* in `AGENTS.md`)
- **New test file**: `src/lib/provider.test.ts`
- **Public API**: `createTranslator`, `Translator`, and the `ProviderResult` union
  (`TranslationResult` plus guard rejections plus `aborted`).
- **Consumes**: `AppConfig` (`provider.baseUrl`, `provider.model`, `provider.apiKey`,
  `pair`) and everything exported by `translate.ts`. Neither file changes.
- **Feeds**: `setup-modal` (a test call to validate config) and `translate-ui` (renders
  results). Neither is built here.
- **Not in scope**: base URL / key validation in the form (`setup`), a server proxy
  (the static-only rule stands, and CORS-blocking providers just get the network error
  message), retries on 429/5xx, streaming.
- **No dependency changes**.
