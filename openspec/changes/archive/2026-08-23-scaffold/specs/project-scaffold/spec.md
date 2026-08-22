## Purpose

Establishes the runnable project foundation — Astro static site with Svelte 5 islands,
strict TypeScript, vitest, and a minimal page — so that all subsequent feature changes
have a working dev/build/test toolchain to build on.

## ADDED Requirements

### Requirement: Astro static site initializes and serves
The project SHALL be an Astro application configured for static output (no SSR).
Running the dev script SHALL start a local dev server at `http://localhost:4321`.

#### Scenario: Dev server starts
- **WHEN** the user runs `npm run dev`
- **THEN** a local dev server starts and the index page is reachable at `http://localhost:4321`

#### Scenario: Production build succeeds
- **WHEN** the user runs `npm run build`
- **THEN** the build completes without errors and produces static output in `dist/`

#### Scenario: Production preview works
- **WHEN** the user runs `npm run preview` after a successful build
- **THEN** the built site is served locally for inspection

### Requirement: Svelte 5 island renders in the page
The index page SHALL mount at least one Svelte 5 component as an Astro island,
verifying that the Svelte integration works end-to-end.

#### Scenario: Svelte island is visible
- **WHEN** the user loads the index page in a browser
- **THEN** a Svelte 5 component is rendered and interactive on the page

### Requirement: TypeScript strict mode is enforced
The project SHALL use TypeScript with the `astro/tsconfigs/strict` base configuration.
Running the typecheck script SHALL verify types without producing a build.

#### Scenario: Typecheck passes on clean scaffold
- **WHEN** the user runs `npx tsc --noEmit`
- **THEN** the command exits with code 0 and no type errors

### Requirement: Vitest is configured and runnable
The project SHALL include vitest as a dev dependency with a `test` script that
runs in watch mode. A single-pass mode SHALL be available via `npx vitest run`.

#### Scenario: Test runner executes
- **WHEN** the user runs `npx vitest run`
- **THEN** vitest discovers and runs tests (zero tests is acceptable at scaffold stage) and exits with code 0

### Requirement: Directory structure matches planned layout
The project SHALL contain the following source directories:
- `src/pages/` — Astro page routes
- `src/components/` — Svelte island components
- `src/lib/` — shared pure-function modules

#### Scenario: Expected directories exist
- **WHEN** the scaffold is complete
- **THEN** `src/pages/`, `src/components/`, and `src/lib/` directories exist

### Requirement: All dependency versions are pinned
Every dependency in `package.json` SHALL use an exact version specifier.
Range specifiers (`^`, `~`, `>=`, etc.) SHALL NOT be used.

#### Scenario: No range specifiers in package.json
- **WHEN** the scaffold is complete and `package.json` is inspected
- **THEN** no dependency version string contains `^`, `~`, or `>=`

### Requirement: npm scripts match AGENTS.md specification
The project SHALL define the following scripts in `package.json`:
`dev`, `build`, `preview`, `test`.

#### Scenario: All required scripts are present
- **WHEN** the scaffold is complete
- **THEN** `package.json` contains `dev`, `build`, `preview`, and `test` scripts
