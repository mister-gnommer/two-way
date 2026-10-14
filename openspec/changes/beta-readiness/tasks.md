# Tasks

## 1. First-run model and setup documentation

- [ ] 1.1 Change `DEFAULT_PROVIDER.model` to `gpt-4.1-mini` without changing saved configuration handling; verify in the browser that a fresh setup shows the new model and an existing `gpt-4o-mini` configuration still opens and saves with its original values.
- [ ] 1.2 Add `README.md` setup instructions, local commands, the short-input scope, and guidance for existing users to change models through Settings; verify that the documented fields and defaults match the setup delta and that no saved-model migration is implied.

## 2. Prompt reliability and provider evidence

- [ ] 2.1 Update `buildTranslationPrompt` with design D2's short-input, off-pair, `und`, and instruction-as-data priorities; extend the existing prompt/data-boundary test with instruction-shaped input and run `npx vitest run src/lib/translate.test.ts src/lib/provider.test.ts`, verifying that user text remains verbatim data and existing response parsing/request behavior still passes.
- [ ] 2.2 Run every design D3 acceptance input three times through the browser app on OpenAI with `gpt-4.1-mini`; record actual outcomes, provider/base URL, model, date, browser, and revision or working-tree state in the README compatibility section. Repeat for RouteLLM only if a usable configuration is available, label untested combinations explicitly, and leave this task incomplete if the primary live checks cannot be performed or fail.

## 3. Embedding documentation and release gates

- [ ] 3.1 Complete the README with plain iframe/`?embed=1` usage, IndexedDB partitioning and memory fallback, direct provider data flow, Gemini/RouteLLM's deferred schema issue, and design D4's deployment checklist; verify that all five release-check areas are covered and that unperformed deployed/start.me checks are visibly pending.
- [ ] 3.2 Update `TODO.md`, `context.md`, and affected `AGENTS.md` structure descriptions to reflect the implemented beta-readiness work; verify that Gemini compatibility, UI polish, and `postmessage-api` remain visible as deferred or unresolved work, and that no unfinished live validation is described as complete.

## 4. Integration validation

- [ ] 4.1 Run `npx vitest run && npx tsc --noEmit && npx svelte-check --fail-on-warnings && npm run build`; verify all checks pass and the output remains static in `dist/`.
- [ ] 4.2 Smoke-test the final build top-level and in a cross-origin iframe: initial setup, saved-settings reload, both translation directions, off-pair notice, copy/fallback, and usable small-frame layout; record the browser/origins and outcomes in the README, keeping actual deployed start.me validation as the separate release gate in design D4.

## Workflow follow-up

- Planning checkpoint: review the completed artifacts and propose the planning commit; commit only on an explicit user request.
- After apply, run OpenSpec verification and code review, resolve findings, and rerun relevant checks. Propose the implementation commit only after verification and review are complete; apply completion alone is not a commit checkpoint.
- After the implementation commit, sync the delta specs and archive the change, then propose the separate archive commit. Never batch the three checkpoints.
- Before announcing a beta release, perform and record the README's deployment-dependent checks. Deploying, pushing, or publishing a version/tag requires a separate explicit user request.
