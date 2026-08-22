## Context

The repo contains only documentation (context.md, AGENTS.md, CONTRIBUTING.md, LICENSE.txt)
and an `openspec/` directory. No `package.json`, no `src/`, no build config exists yet.
See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Produce a runnable Astro project with Svelte 5 islands and strict TypeScript
- Establish the `src/` directory structure that later changes will populate
- Verify the full stack works end-to-end (dev server, build, typecheck, test runner)
- Pin all dependencies to exact versions

**Non-Goals:**
- Any business logic (translation, provider calls, storage, setup modal)
- UI design or styling beyond what's needed to prove the island renders
- Embed/iframe testing, `?embed=1` mode, or start.me integration
- CI/CD pipeline or Vercel deployment config
- `.gitignore` / editor config beyond what Astro scaffolds by default

## Decisions

### Use `npm create astro` as the starting point
Run `npm create astro` with the minimal template, then layer Svelte and vitest on top.
This gives us a known-good `astro.config.mjs` and `tsconfig.json` rather than
hand-writing them.

**Alternative considered**: Hand-scaffold everything from scratch — more control but
higher risk of missing a required config field, and no benefit at this stage.

### Svelte 5 via `@astrojs/svelte` integration
Add Svelte through Astro's official integration, which handles the Svelte compiler
setup and island hydration automatically. This is the standard path and avoids
manual Svelte/webpack-style config.

### Vitest without a framework plugin
Vitest runs standalone with `vitest/config`. No `@testing-library/svelte` at scaffold
stage — components have no coverage requirements per AGENTS.md. Library additions
happen when component tests are actually needed.

Addendum (post-implementation): vitest 4.x exits immediately when no test files exist —
even in watch mode — so the spec's watch-mode requirement cannot hold with zero tests.
A single trivial smoke test (`src/lib/toolchain.test.ts`, plus `passWithNoTests: true`
in `vitest.config.ts`) keeps watch mode alive; replace it with real lib tests when they
land. The smoke test is toolchain verification, not business logic.

### Pin versions at install time
Run installs with `--save-exact` (or manually edit `package.json` after install)
to ensure no range specifiers. This follows the AGENTS.md "pin exact package versions"
rule.

### Minimal Svelte island for verification
Create a trivial `App.svelte` that renders a heading or counter — just enough to
confirm Svelte runes mode works inside Astro. The component will be replaced by real
feature work later.

## Risks / Trade-offs

- [Astro `create` CLI may scaffold with range specifiers] → Post-process `package.json`
  to strip `^`/`~` after initial install.
- [Svelte 5 runes may need explicit opt-in depending on version] → Check `@astrojs/svelte`
  docs during implementation; ensure `compilerOptions` enable runes if needed.
- [vitest config may need `environment` setting for Svelte] → Defer — no component
  tests at scaffold stage, so default `node` environment suffices for lib tests.
