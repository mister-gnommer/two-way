# AGENTS.md

Agent instructions. For what this project is and why decisions were made, read `context.md` (temporary — replaced by Openspec specs at v1).

## Scope guardrails — do not add

Streaming, history, document-length input, diff view. Multi-pair support is post-beta — don't build it early.

## Structure

Single Astro app, **static output only**; one page mounts the main Svelte island. *Update this section after every change.*

- `src/pages/index.astro` — the only page; mounts the App island with `client:load`; an inline head script sets `data-embed` on `<html>` before first paint, plus the global embed page rules
- `src/styles/theme.css` — shared light/dark colour tokens and system UI font; follows the system scheme in the page, panel and modal; components use these tokens
- `src/components/App.svelte` — main Svelte island (loads config via storage; loading state; once configured renders the translation panel plus a Settings button — a corner gear icon in embed mode, which also makes the panel compact; opens the setup modal — blocking while unconfigured, via Settings once configured)
- `src/components/TranslatePanel.svelte` — translation panel: pair indicator, textarea (Enter submits, Shift+Enter newline), Translate/clear buttons, live result area (translation with `PL → EN` direction, notice, error) and Copy with an iframe-safe fallback; animates direction changes through View Transitions with reduced-motion and staleness guards; answers the R'lyehian chant locally with finite eldritch styling; resets on saved settings; `compact` prop for embed (full width, label as a themed placeholder, 2 rows)
- `src/lib/types.ts` — `AppConfig` / `StoredRecord` shapes (provider + unordered language pair)
- `src/lib/storage.ts` — all IndexedDB access behind a small async API (`createStorage()`; in-memory fallback + `inmemoryFallback` signal)
- `src/lib/storage.test.ts` — storage unit tests (fake-indexeddb; fallback via stubbed global)
- `src/lib/toolchain.test.ts` — vitest smoke test
- `src/lib/translate.ts` — translation contract: prompt builder, input guard, response parser (pure functions)
- `src/lib/translate.test.ts` — translation unit tests (prompt, guard, parser, pair/detection edge cases)
- `src/lib/provider.ts` — provider call: latest-wins `createTranslator()` over OpenAI-compatible Chat Completions (strict json_schema, temperature retry, timeout, fixed error copy)
- `src/lib/provider.test.ts` — provider unit tests (injected fetch stub, no network)
- `src/lib/setup.ts` — setup validation: `validateSetup` (trim/required, `completeBaseUrl` https:// completion, https-or-loopback base URL, visible-ASCII key, distinct pair), `DEFAULT_PROVIDER` first-run prefills, the curated `LANGUAGES` list and `languageOptions` (Polish, English first), `languageLabel` (English language names, shared with the panel)
- `src/lib/setup.test.ts` — setup validation unit tests (form rules, URL/key rejection, language list invariants)
- `src/lib/translate-view.ts` — panel display logic: `shortTag`, `pairLabel` / `directionLabel` (`PL ↔ EN`, `PL → EN` + full names), `resultView` (translation outcome → result-area view; `aborted` → null)
- `src/lib/translate-view.test.ts` — display helper unit tests
- `src/lib/cthulu.ts` — loose full-chant matching and the local English easter-egg translation view
- `src/lib/cthulu.test.ts` — chant matching and reply contract unit tests
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
- Embed mode is `?embed=1` **or** any framing, marked by `data-embed` on `<html>` (set by the inline head script — the single source of truth; CSS keys on `:root[data-embed]`, App reads the attribute in `onMount`). It hides the title, uses a compact layout and shrinks Settings to a gear icon.
- Verify changes in an iframe context, not just top-level browsing.

## Code style

- Svelte 5 runes islands; do not port React idioms. Coming from other projects code: translate behaviour, not code.
- TypeScript strict (`astro/tsconfigs/strict`); brace every `if`; avoid type assertions (comment why if unavoidable).
- Plain CSS with custom properties — no Tailwind, no CSS-in-JS.
- Pin exact package versions — no `^` or `~`.

## Testing

vitest for pure logic only (prompt builder, detection/pair edge cases, storage serialization). Mock the provider boundary; no network calls in unit tests. Components have no coverage requirements. Run `npx vitest run && npx tsc --noEmit && npx svelte-check --fail-on-warnings` after every change (`astro check` does not surface Svelte compiler warnings).

## Workflow

Spec-first via Openspec (`openspec/`); implementation follows change proposals. Commit messages follow `CONTRIBUTING.md`. Semver tags. Vercel Hobby deploys on push to `main`. Keep an easter egg of Cthulhu-class magnitude somewhere in the UI.

Commit cadence for Openspec changes: the agent SHALL propose three separate commits:

1. After planning: artifacts complete.
2. After implementation, OpenSpec verification, and code review: tasks complete, review findings resolved, and relevant checks rerun after fixes. Code review may be agent-led.
3. After archiving: main specs synced and the change archived.

Completing apply alone is not a commit checkpoint. Suggest verification and code review next; propose the implementation commit only after both are complete. Never batch these three checkpoints into one commit. Commit only when the user explicitly asks.
