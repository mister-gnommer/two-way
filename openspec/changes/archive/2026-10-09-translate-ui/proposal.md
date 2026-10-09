## Why

The translation contract, the provider client and the setup modal all exist, but a
configured user still sees only the placeholder "configured pair: pl ↔ en". This change adds
what the app is for: type a word or short sentence, press Enter, and see the translation
with the direction it went (PL → EN). It also covers what happens when the text is outside
the pair or the provider fails.

## What Changes

- Add `src/components/TranslatePanel.svelte`. App mounts it in place of the configured
  placeholder; the Settings button stays in App. The panel has:
  - a pair indicator (`PL ↔ EN`);
  - a textarea for the input;
  - a Translate button;
  - a "×" clear button;
  - a single result area.
- **Trigger: Enter or the Translate button.** Shift+Enter inserts a newline. Enter while
  an IME is composing does not submit. Typing never sends a request on its own.
- **Inline outcomes.** One result area shows the current state:
  - "Translating…";
  - the translation;
  - the off-pair message;
  - the guard message (blank or too long);
  - the provider's fixed error copy, styled as an error.

  It is a live region, so screen readers announce each outcome. This replaces the
  roadmap's "error toast": a toast does not fit a ~300 px iframe box.
- **Input is never destroyed.** No outcome clears the input, and an error leaves it ready
  to resend. Only the clear button empties it.
- **Direction display.** A translation shows its direction as uppercased primary subtags
  (`PL → EN`). The full names ("Polish → English") are available as the accessible label
  and tooltip. A regional pair member shows its primary subtag (`pl-PL` → `PL`).
- **Latest wins.** A new submit supersedes the one in flight, so a stale answer never
  replaces a newer one. The provider client already guarantees this; the panel ignores
  `aborted`.
- **Copy result.** A button copies the translation and briefly shows "Copied". Inside an
  iframe without clipboard permission it falls back to a selection-based copy. If that also
  fails, it selects the text and asks the user to copy it manually.
- **Settings change resets the result.** Saving new settings cancels any in-flight request
  and clears the result, because the pair or provider may have changed. The input is kept.
- Pure display helpers (direction and pair labels, and outcome → view mapping) live in
  `src/lib/translate-view.ts` and are unit-tested. `setup.ts` exports its language-label
  helper so both modules name languages the same way.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `translation`: adds the user-facing requirements: the panel, the Enter/button trigger,
  inline outcomes, input preservation, the direction display, supersession in the UI,
  copy, clear, and the reset on settings change. The existing contract and provider
  requirements are unchanged.

## Impact

- **New files**:
  - `src/components/TranslatePanel.svelte`
  - `src/lib/translate-view.ts`
  - `src/lib/translate-view.test.ts`
- **Changed files**:
  - `src/components/App.svelte`: renders the panel when configured.
  - `src/lib/setup.ts`: exports `languageLabel`, which was the private `labelFor`.
  - `AGENTS.md`: Structure section.
- **Consumes, unchanged**: `createTranslator`, `ProviderResult`, `AppConfig`.
- **Not in scope**:
  - `?embed=1` compact layout and hiding Settings (`embed-mode`);
  - theme, the direction-flip view transition and the easter egg (`presentation`);
  - a character counter;
  - auto-translate while typing;
  - history.
- **No dependency changes**.
