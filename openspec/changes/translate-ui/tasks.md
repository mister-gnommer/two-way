## 1. Display helpers

- [x] 1.1 Rename `labelFor` in `src/lib/setup.ts` to `languageLabel` and export it, keeping `languageOptions` on it (D2); verify the existing `setup.test.ts` suite still passes
- [x] 1.2 Create `src/lib/translate-view.ts` with `shortTag`, `pairLabel` and `directionLabel` (D2); verify tests in `src/lib/translate-view.test.ts` cover:
  - `pl-PL` → `PL`;
  - pair `pl` / `en` → text `PL ↔ EN` and name `Polish ↔ English`;
  - direction `pl-PL` → `en` → text `PL → EN` and name `Polish (Poland) → English`.
- [x] 1.3 Add the `ResultView` union and `resultView(outcome)` (D2); verify tests assert:
  - a translation maps to its text, its target as `lang`, and its direction;
  - `off-pair`, `blank` and `too-long` map to `notice` with their message;
  - `error` maps to `error`;
  - `aborted` maps to `null`.

## 2. Translation panel

- [x] 2.1 Create `src/components/TranslatePanel.svelte` with prop `config`, a pair indicator from `pairLabel`, a labelled `<textarea>` with D8's attributes, a Translate button in one `<form>`, and the always-rendered `role="status"` result area (D1, D7); verify `npx svelte-check --fail-on-warnings` passes
- [x] 2.2 Wire submit (D3, D4):
  - Enter (without Shift, outside IME composition) calls `requestSubmit()`;
  - submit sets `translating`, awaits `translate(config, input)` and applies `resultView` unless it is `null`;
  - `onMount` teardown cancels the translator.

  Verify `npx svelte-check --fail-on-warnings` passes (behaviour is checked manually in 3.3).
- [x] 2.3 Render each `ResultView` kind (D7):
  - a direction label with visible tag text, a visually-hidden name and a `title`;
  - the translation in `<p lang={target}>`;
  - the `notice` and `error` styles.

  Verify `npx svelte-check --fail-on-warnings` passes (checked visually in 3.3).
- [x] 2.4 Add the "×" clear button, shown only while the input is non-empty. It empties the input, focuses it, cancels the translator and sets `idle` (D8). Verify `npx svelte-check --fail-on-warnings` passes (behaviour is checked manually in 3.3).
- [x] 2.5 Add the Copy button for translations (D6):
  - try the Clipboard API, then the `Range` selection with `execCommand('copy')`, then keep the text selected and show the manual hint;
  - show "Copied" for about 1.5 s, and clear the timer on a new view and on teardown.

  Verify `npx svelte-check --fail-on-warnings` passes (behaviour is checked manually in 3.3).
- [x] 2.6 Add the `$effect` on `config` that cancels the translator and sets `idle` inside `untrack` (D5); verify `npx svelte-check --fail-on-warnings` passes (behaviour is checked manually in 3.3)

## 3. App wiring, docs and integration

- [x] 3.1 Update `App.svelte` to render `<TranslatePanel {config} />` in place of the configured placeholder, keeping the Settings button and the modal wiring (D1). Update the `AGENTS.md` Structure section:
  - the `App.svelte` line;
  - new `TranslatePanel.svelte`, `translate-view.ts` and `translate-view.test.ts` lines;
  - `languageLabel` in the `setup.ts` line.

  Remove `plan translate-ui` from `TODO.md` current work. Verify that `npx astro build` succeeds and that every file listed in `AGENTS.md` exists.
- [x] 3.2 Run `npx vitest run && npx tsc --noEmit && npx svelte-check --fail-on-warnings && npx astro check`; verify all pass with 0 warnings
- [x] 3.3 Manual check (user-run, needs a real key) in `astro dev`, both top-level and inside a cross-origin iframe without an `allow` attribute:
  - Before any submit:
    - the panel shows `PL ↔ EN` for a `pl`/`en` pair;
    - typing alone sends no request (DevTools Network);
    - Shift+Enter inserts a newline.
  - Submitting:
    - `kawa` plus Enter shows "Translating…", then `coffee` with `PL → EN`, and the tooltip reads "Polish → English";
    - `coffee` shows `EN → PL`.
  - Messages:
    - German text shows the off-pair message, not styled as an error;
    - blank submit and over-500-character input show the guard messages, with no request sent;
    - a wrong key in Settings shows the key-rejected error in error style, and the input is kept.
  - Supersede: two quick submits with throttling show only the second outcome, and the first request is cancelled.
  - Clear: "×" clears the input and result and focuses the input, and clearing during a request cancels it.
  - Copy:
    - Copy puts the translation on the clipboard and shows "Copied";
    - in the iframe it still copies, or it selects the text with the manual hint.
  - Settings:
    - saving a new pair clears the result, keeps the input and updates the pair indicator;
    - Cancel keeps the result.
  - Typing Polish with a Japanese or Chinese IME, confirming with Enter does not submit (if an IME is available).

## Workflow follow-up

- Propose a commit after planning, after apply, and after archive (three commits).
- Archive the change once tasks are complete and the user has reviewed the spec.
- At archive, tick `translate-ui` in the `context.md` roadmap and set the next `TODO.md` item to `plan embed-mode`.
