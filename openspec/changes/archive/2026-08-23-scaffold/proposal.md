## Why

The two-way project has design docs (context.md, AGENTS.md) but no runnable code.
A working scaffold — Astro + Svelte 5 + TypeScript with all deps installed and a
minimal page — is needed before any feature work can begin.

## What Changes

- Initialize Astro project with static output mode
- Add Svelte 5 integration (Svelte runes as island framework)
- Add TypeScript with strict config (`astro/tsconfigs/strict`)
- Add vitest for unit testing
- Create planned directory structure (`src/lib/`, `src/components/`, `src/pages/`)
- Create a minimal index page with a Svelte island to verify the stack works
- Configure npm scripts: `dev`, `build`, `preview`, `test`, `typecheck`
- Pin all dependency versions (no `^` or `~`)

## Capabilities

### New Capabilities
- `project-scaffold`: Astro + Svelte 5 + TypeScript project initialization, directory structure, dev/build toolchain, and a minimal page that proves the stack works end-to-end.

### Modified Capabilities

_(none — no existing specs)_

## Impact

- **Dependencies**: Astro, @astrojs/svelte, Svelte 5, TypeScript, vitest, @astrojs/check
- **Structure**: Creates `src/`, `public/`, `package.json`, `tsconfig.json`, `astro.config.mjs`
- **Scripts**: Adds npm scripts matching AGENTS.md specification
- **No runtime business logic** — scaffold only; translation/provider/storage come in later changes
