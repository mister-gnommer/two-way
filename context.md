# two-way — project context

Mem-dump of the planning conversation (2026-08-21). Decisions, rationale, constraints.
This file is temporary and will be replaced with Openspec spec after reaching v1 

## What it is

BYOK webpage for bidirectional auto-translation of a fixed language pair.
User sets a pair (e.g. `pl-en`), pastes a word/short sentence in either language,
gets it translated to the other. No direction toggle — detection decides.

- Scope: **single words / short sentences** (not documents).
- Language pair is user-configurable; beta ships with one active pair, multi-pair
  management (several saved pairs, switchable) comes post-beta. Keep pair as data,
  not hardcoded constants.
- Primary use case: **embedded widget** on a start.me start page (via their "Embed" widget).
- BYOK: user supplies their own LLM API key; no backend inference of our own.

## Name

`two-way` — follows the mister-gnommer convention: lowercase, hyphenated,
idiom/pun with a wink (`polisher`, `trust-issues`, `keep-it-tidy`, `empty-cart`).
Runners-up were `two-way-street`, `ping-pong`, `either-way`, `switcheroo`.

## Backend decision

**LLM + prompt (BYOK)** over self-hosted LibreTranslate:

- Users already bring keys → zero inference infra for us, free VPS stays free.
- Quality gap is large (PL↔EN idioms/slang), auto-detect is one prompt instruction.
- Use a **cheap/fast model tier** (mini/haiku class) — single-sentence translation
  doesn't need reasoning. Temperature **0–0.2** (determinism; polisher's 0.5 was for editing).

## Explicitly out / rejected

- **No streaming.** Short outputs don't need it; also avoids partial-JSON parsing
  that structured output + streaming would require.
- **No LibreTranslate** (mediocre quality, RAM-hungry on the free VPS).
- **No history feature.**
- Diff view from polisher (cross-language diff is meaningless).
- Polishing levels (maybe later: optional tone/register selector).

## Learning goals (the point of the project)

1. **Svelte 5 island(s) inside Astro** — mixed-framework islands; runes vs React mental model.
2. **Structured output / JSON-schema mode** — provider-enforced `{detected_lang, translation}`
   instead of prompt-hoping. Schema design note: keep translation as its own field;
   show detected direction prominently in UI ("PL → EN").
3. **View Transitions API** — animation for the direction flip (PL→EN ↔ EN→PL);
   Astro has first-class support.
4. **IndexedDB for config storage** (NOT history): API key, language pair, model choice,
   whatever else. Raw IDB API first (that's the learning), consider `idb` wrapper after.
   - Implication: IDB is async → app needs a loading state before deciding whether
     to show the setup modal (polisher read localStorage synchronously during render).

## Embedding constraints (start.me)

Confirmed: start.me's Embed Content widget is a **plain iframe** (their docs say so verbatim).

- Serve over HTTPS; never set `X-Frame-Options` or CSP `frame-ancestors` that would
  block framing. Vercel defaults are fine — re-check if adding security headers later.
- **Third-party storage partitioning**: our origin inside start.me's iframe is
  third-party context. Chrome/Edge partition IDB per embedding site (config persists,
  but only within start.me). Safari/Brave may block IDB entirely → setup modal on every
  visit. Fallback plan: session-only key when storage throws. Test early in Safari-in-iframe.
- Compact layout for small widget box; vertical setup with max width 300 px
- Support `?embed=1` mode hiding settings chrome.
- Optional bonus: tiny `postMessage` API so host pages can prefill text / read results.

## Prompt design notes

- System prompt must define edge-case behavior:
  - input in neither pair language → reject with message vs translate anyway (decide)
  - mixed-language input
  - ambiguous words existing in both languages (e.g. "gift" in PL and EN) — exactly
    where detection fails on single-word input; detected_lang display helps here.
- Response contract: JSON `{detected_lang, translation}` via schema enforcement.

## Reuse from polisher (github.com/mister-gnommer/polisher)

Polisher = Astro static + React island, `/api/polish` serverless proxy to Abacus
RouteLLM (gpt-5.2), client sends apiKey + systemPrompt to own server, no streaming.

Keep the patterns:

- Setup modal blocking app until key/provider configured
- Error toast + user input never destroyed on failure
- AbortController race handling (even without streaming, requests can race)
- Storage key naming convention → `two-way.*`

Things to do differently:

- **No server proxy** — call the provider directly from the browser (most
  OpenAI-compatible APIs allow CORS). App becomes 100% static; key never leaves the
  browser (in polisher it transited our Vercel function). Only add a thin proxy if
  the chosen provider blocks CORS.
- **Generic "OpenAI-compatible" provider config** (base URL + model name) instead of
  hardcoded Abacus — covers OpenAI/OpenRouter/Groq/local etc. with one abstraction.
- Add **vitest** for pure logic (prompt builder, lang-pair/detection edge cases) — polisher had zero tests.
- Don't copy `performPolishRef.current = performPolish` during render (PolisherApp.tsx:261) — not idiomatic.
- Easter egg tradition: keep something Cthulhu-class.

## Roadmap

Ordered, dependency-first. Each line is an Openspec **change**; its delta specs land in
the listed capability (`openspec/specs/<capability>/`). The full capability map lives in
`openspec/config.yaml` — change name ≠ capability name. Commit after planning, applying,
and archiving each change (three commits per change).

Done:

- [x] `scaffold` → project-scaffold (frozen)
- [x] `storage-layer` → config-storage
- [x] `translate-core` → translation
- [x] `provider-client` → translation

Next, in order:

- [ ] `setup-modal` → setup — blocking modal, provider + pair, validation
- [ ] `translate-ui` → translation — input, direction display, result, error toast
- [ ] `embed-mode` → embedding — `?embed=1`, compact, hide chrome
- [ ] `presentation` → presentation — theme (plain CSS custom properties), direction-flip view transition, Cthulhu-class easter egg
- [ ] `postmessage-api` → embedding — optional bonus (host prefill/read)

## Stack summary

- Astro (static output only) + Svelte 5 islands + TypeScript
- Plain CSS with custom properties (no Tailwind, no CSS-in-JS)
- Direct browser→provider calls, OpenAI-compatible endpoint config
- IndexedDB for config, View Transitions API, vitest
- Hosting: Vercel Hobby (same as polisher)
- semver and Openspec
