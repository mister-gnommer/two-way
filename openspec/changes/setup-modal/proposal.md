## Why

Storage, the translation contract, and the provider client exist, but nothing lets a user
enter a provider and a language pair. The app still prints "no config yet". Before the
translation UI (`translate-ui`) can exist, the user needs a setup step that blocks the app
until it is configured, validates what goes in, and can be reopened later. Two earlier
changes also deferred checks to this change: the base URL must be `https://` (otherwise
the key could travel unencrypted), and both pair languages must differ in their primary
subtag (otherwise detection can't pick a direction).

## What Changes

- Add `src/components/SetupModal.svelte`, a native `<dialog>` modal with a vertical form
  that is at most 300 px wide. It has base URL, model, API key (masked, with a show toggle),
  and two language dropdowns side by side with the two-way arrow icon between them.
  A short italic intro under the heading says what the app does and where the key goes.
  On first run the base URL and model are prefilled with OpenAI defaults
  (`https://api.openai.com/v1`, `gpt-4o-mini`), and both fields have a "×" button that
  clears them.
- **Blocking on first run.** After the config load settles to `null`, the modal opens and
  cannot be dismissed until a valid config is saved. It never opens while config is still
  loading.
- **Reopenable.** When a config exists, a settings button opens the modal prefilled with
  that config. In this mode it can be cancelled without changes. Hiding the button in
  `?embed=1` belongs to `embed-mode`.
- **Validation before save** (pure, unit-tested, in `src/lib/setup.ts`):
  - All fields are trimmed and required.
  - The base URL must be `https://`, except loopback hosts (`localhost`, `127.0.0.1`,
    `[::1]`), which may use `http://`. It must not contain credentials, a query, or a
    fragment. A base URL typed without a scheme gets `https://` prepended, and the field
    shows the completed URL once it loses focus.
  - The API key may contain only visible ASCII, which catches pasted whitespace and
    smart quotes.
  - The two languages must differ.
  - Errors are shown per field.
- **Curated language list.** Both languages are chosen from about 35 common languages,
  stored as primary-language BCP-47 tags (`pl`, `en`, `de`, …) and labelled with
  `Intl.DisplayNames`. Two different entries always differ in primary subtag. A stored tag
  that is not in the list stays selectable, so reopening and saving never silently changes
  the pair. Polish and English come first, then the rest by name. An unchosen dropdown
  shows a "Select…" prompt that cannot be picked from the list.
- **Optional Test button.** It runs one real translation with the current form values
  through `createTranslator`. Any provider answer (translation or off-pair) counts as
  success. Otherwise the provider client's fixed error message is shown. Saving does not
  require a test. Changing a field clears a stale test result.
- **Storage notice.** When storage has fallen back to memory, the modal states that
  settings last only for this session. The notice is informational, not an error.
- Update `App.svelte`: show the loading state, then either the blocking modal or the
  configured placeholder with the settings button. Saving goes through `storage.save`.

## Capabilities

### New Capabilities

- `setup`: the setup modal. It covers when it blocks and when it can be dismissed, the
  config form and its validation (base URL scheme, required fields, key characters,
  distinct pair from a curated list), the on-demand test call, saving, and the
  session-only storage notice.

### Modified Capabilities

None. `config-storage` and `translation` are consumed as they are.

## Impact

- **New files**: `src/components/SetupModal.svelte` (listed as *planned* in `AGENTS.md`),
  `src/lib/setup.ts` (validation and the language list), `src/lib/setup.test.ts`
- **Moved asset**: `two-way-icon.svg` (repo root, untracked) → `public/two-way-icon.svg`
- **Changed file**: `src/components/App.svelte`. It wires storage, the modal, and the
  settings button. The real translation UI still comes with `translate-ui`.
- **Consumes**: `createStorage` (`load`, `save`, `loading`, `inmemoryFallback`),
  `createTranslator`, `AppConfig`. None of them change.
- **Not in scope**: hiding settings in embed mode (`embed-mode`), theming and polish
  (`presentation`), multi-pair management (post-beta), provider presets.
- **No dependency changes**.
