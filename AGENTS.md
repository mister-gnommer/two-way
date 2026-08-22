# AGENTS.md

Agent instructions. For what this project is and why decisions were made, read `context.md` (temporary — replaced by Openspec specs at v1).

## Scope guardrails — do not add

Streaming, history, document-length input, diff view. Multi-pair support is post-beta — don't build it early.

## Commands

Scripts do not exist yet (repo is pre-scaffold); create them exactly like this when scaffolding:

```bash
npm run dev        # Astro dev server at http://localhost:4321
npm run build      # production build (static output)
npm run preview    # preview production build
npm run test       # vitest in watch mode
npx vitest run     # single test pass
npx tsc --noEmit   # typecheck without building
```

No lint/format scripts planned. Run `npx vitest run && npx tsc --noEmit` after every change.

### post scaffolding

After scaffolding, remove this section from the AGENTS.md file as every agent can just read package.json

## Structure (planned)

Single Astro app, **static output only**; one page mounts the main Svelte island. *Update this section after every change.*

- `src/lib/translate.ts` — prompt builder + response parsing (pure functions; the vitest target)
- `src/lib/provider.ts` — provider call (base URL + model + API key are user config)
- `src/lib/storage.ts` — all IndexedDB access behind a small async API
- `src/components/App.svelte`, `SetupModal.svelte` — the islands

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

vitest for pure logic only (prompt builder, detection/pair edge cases, storage serialization). Mock the provider boundary; no network calls in unit tests. Components have no coverage requirements.

## Workflow

Spec-first via Openspec (`openspec/`); implementation follows change proposals. Commit messages follow `CONTRIBUTING.md`. Semver tags. Vercel Hobby deploys on push to `main`. Keep an easter egg of Cthulhu-class magnitude somewhere in the UI.
