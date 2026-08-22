## 1. Astro project initialization

- [x] 1.1 Run `npm create astro` with the minimal template (empty, no TypeScript yet) in the repo root and verify `astro.config.mjs` and `package.json` are created
- [x] 1.2 Set `output: 'static'` in `astro.config.mjs` (if not already default) and verify `npm run build` exits 0
- [x] 1.3 Verify `npm run dev` starts a server at `http://localhost:4321`

## 2. TypeScript strict setup

- [x] 2.1 Install `typescript` and `@astrojs/check` as exact-version dev dependencies and verify `npx tsc --noEmit` exits 0
- [x] 2.2 Configure `tsconfig.json` to extend `astro/tsconfigs/strict` and verify typecheck still passes

## 3. Svelte 5 integration

- [x] 3.1 Install `@astrojs/svelte` and `svelte` as exact-version dev dependencies, register the integration in `astro.config.mjs`, and verify build still succeeds
- [x] 3.2 Create `src/components/App.svelte` with a minimal Svelte 5 runes component (e.g., a counter with `$state`) and verify it renders as an island on the index page
- [x] 3.3 Create `src/pages/index.astro` (or update the existing one) to mount `App.svelte` as a client island and verify the island is interactive in the browser

## 4. Vitest setup

- [x] 4.1 Install `vitest` as an exact-version dev dependency, add `vitest.config.ts` if needed, and verify `npx vitest run` exits 0 (zero tests is acceptable)
- [x] 4.2 Add `test` script (`vitest`) to `package.json` and verify `npm run test` works in watch mode (Ctrl+C to exit)

## 5. Directory structure and npm scripts

- [x] 5.1 Ensure `src/lib/` directory exists (create if missing) with a placeholder or `.gitkeep`
- [x] 5.2 Verify `package.json` scripts match spec: `dev`, `build`, `preview`, `test` — add any that are missing
- [x] 5.3 Audit `package.json` dependencies — replace any `^` or `~` specifiers with exact versions and verify `npm install` still succeeds

## 6. Final verification

- [x] 6.1 Run the full verification suite and confirm all pass: `npm run build`, `npx tsc --noEmit`, `npx vitest run`, `npm run dev` serves the page with a visible Svelte island
