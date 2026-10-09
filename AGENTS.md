# AGENTS.md

Agent instructions. For what this project is and why decisions were made, read `context.md` (temporary — replaced by Openspec specs at v1).

## Scope guardrails — do not add

Streaming, history, document-length input, diff view. Multi-pair support is post-beta — don't build it early.

## Structure

Single Astro app, **static output only**; one page mounts the main Svelte island. *Update this section after every change.*

- `src/pages/index.astro` — the only page; mounts the App island with `client:load`
- `src/components/App.svelte` — main Svelte island (loads config via storage; loading/configured states; opens the setup modal — blocking while unconfigured, via Settings once configured)
- `src/lib/types.ts` — `AppConfig` / `StoredRecord` shapes (provider + unordered language pair)
- `src/lib/storage.ts` — all IndexedDB access behind a small async API (`createStorage()`; in-memory fallback + `inmemoryFallback` signal)
- `src/lib/storage.test.ts` — storage unit tests (fake-indexeddb; fallback via stubbed global)
- `src/lib/toolchain.test.ts` — vitest smoke test
- `src/lib/translate.ts` — translation contract: prompt builder, input guard, response parser (pure functions)
- `src/lib/translate.test.ts` — translation unit tests (prompt, guard, parser, pair/detection edge cases)
- `src/lib/provider.ts` — provider call: latest-wins `createTranslator()` over OpenAI-compatible Chat Completions (strict json_schema, temperature retry, timeout, fixed error copy)
- `src/lib/provider.test.ts` — provider unit tests (injected fetch stub, no network)
- `src/lib/setup.ts` — setup validation: `validateSetup` (trim/required, `completeBaseUrl` https:// completion, https-or-loopback base URL, visible-ASCII key, distinct pair), `DEFAULT_PROVIDER` first-run prefills, the curated `LANGUAGES` list and `languageOptions` (Polish, English first)
- `src/lib/setup.test.ts` — setup validation unit tests (form rules, URL/key rejection, language list invariants)
- `src/components/SetupModal.svelte` — setup modal island: native `<dialog>` form for provider + language pair; blocking on first run, reopenable from Settings; validates, optionally tests through `createTranslator`, saves via `onsave`
- Root configs: `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`

### Static-only rule

**No backend.** Never add `src/pages/api/*` routes or a server proxy unless a chosen provider provably blocks CORS — raise it as a decision first. The API key must never transit any server of ours.

## Storage rules

Config lives in IndexedDB (`two-way.` name prefix), raw IDB API first — no `idb` wrapper without asking.

- IDB is async: always render a loading state and load config before deciding whether to show the setup modal. Never read config synchronously during render.
- If storage throws (third-party contexts may partition or block it), degrade to session-only config — never crash, never loop the setup modal.

## Embedding rules

The page runs inside a plain iframe on start.me or as a standalone page.

- Never introduce headers/CSP (`X-Frame-Options`, `frame-ancestors`) that block framing.
- Support `?embed=1`: hide settings chrome, compact layout.
- Verify changes in an iframe context, not just top-level browsing.

## Code style

- Svelte 5 runes islands; do not port React idioms. Coming from other projects code: translate behaviour, not code.
- TypeScript strict (`astro/tsconfigs/strict`); brace every `if`; avoid type assertions (comment why if unavoidable).
- Plain CSS with custom properties — no Tailwind, no CSS-in-JS.
- Pin exact package versions — no `^` or `~`.

## Testing

vitest for pure logic only (prompt builder, detection/pair edge cases, storage serialization). Mock the provider boundary; no network calls in unit tests. Components have no coverage requirements. Run `npx vitest run && npx tsc --noEmit` after every change.

## Workflow

Spec-first via Openspec (`openspec/`); implementation follows change proposals. Commit messages follow `CONTRIBUTING.md`. Semver tags. Vercel Hobby deploys on push to `main`. Keep an easter egg of Cthulhu-class magnitude somewhere in the UI.

Commit cadence for Openspec changes: the agent SHALL propose committing after each significant step — after planning (artifacts complete), after applying/implementing (tasks complete), and after archiving. That's three commits per spec change; never batch steps into one commit.
