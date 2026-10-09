## 1. Validation module

- [x] 1.1 Create `src/lib/setup.ts` with the `SetupForm` input shape, the `validateSetup(form)` result union (D1), and fixed per-field error copy; verify `npx tsc --noEmit` passes
- [x] 1.2 Implement trimming and required fields for base URL, model, and key (D1); verify tests cover surrounding whitespace removed from saved values and an empty or whitespace-only field producing an error only for that field
- [x] 1.3 Implement the base URL rule (D2); verify tests accept `https://api.openai.com/v1`, `http://localhost:11434/v1`, `http://127.0.0.1:1234/v1`, `http://[::1]:8080/v1`, and reject `http://api.example.com/v1` (HTTPS message), a non-URL, `https://user:pw@host/v1`, `https://host/v1?x=1`, and `https://host/v1#x`; the saved base URL is the trimmed input as typed
- [x] 1.4 Implement the visible-ASCII key rule (D3); verify tests reject an inner space, `\n`, and `“`, accept a normal `sk-…` key, and assert the error message never contains the key
- [x] 1.5 Implement `LANGUAGES`, `languageOptions(saved)` with `Intl.DisplayNames` labels sorted by label, and the pair checks (missing selection per field, identical selection) (D4); verify tests assert every listed tag is unique in primary subtag and passes `Intl.getCanonicalLocales` unchanged, an unlisted saved `pl-PL` appears in the options, identical languages yield a pair error, and several invalid fields are reported together
- [x] 1.6 Reject a bare `?` or `#` in the base URL (D2); verify by adding `https://host/v1?` and `https://host/v1#` to the rejection test table
- [x] 1.7 Pin `pl` then `en` at the top of `languageOptions`, sorting the rest by label (D4); verify tests assert the first two options are `pl` and `en`, the rest are sorted by label, and an unlisted saved tag lands in the sorted part
- [x] 1.8 Export `DEFAULT_PROVIDER` (`https://api.openai.com/v1`, `gpt-4o-mini`) from `setup.ts` (D13); verify `npx tsc --noEmit` passes
- [x] 1.9 Add `completeBaseUrl` and use it in `validateSetup` (D2); verify tests that `api.openai.com/v1` is saved as `https://api.openai.com/v1`, `localhost:11434/v1` becomes `https://localhost:11434/v1`, `HTTPS://x.com/v1` stays unchanged, and `http://api.example.com/v1` is still rejected; move the existing `api.openai.com/v1` → invalid case to the accepted cases

## 2. Setup modal component

- [x] 2.1 Create `src/components/SetupModal.svelte`: native `<dialog>` opened with `showModal()` on mount, props `config`, `blocking`, `sessionOnly`, `onsave`, `oncancel` (D5, D6), and the vertical form seeded from `config`, with base URL, model, key (masked plus Show toggle and D9 attributes), and two language selects from `languageOptions`; verify `npx astro check` and `npx tsc --noEmit` pass
- [x] 2.2 Move `two-way-icon.svg` from the repo root to `public/` and lay out the pair row as `[select A] [icon] [select B]` (D11), with a decorative icon and labelled selects; verify `npx astro build` copies `two-way-icon.svg` into `dist/` and the row fits the 300 px column (checked visually in 4.2)
- [x] 2.3 Wire Save (D8): validate, render per-field errors with `aria-invalid`/`aria-describedby`, call `onsave` only when valid, and disable Save while pending; verify `npx astro check` passes (behaviour is checked manually in 4.2)
- [x] 2.4 Implement blocking mode (D5): `preventDefault` on `cancel`, reopen on `close` while blocking, and no Cancel button; reopened mode adds a Cancel button and Escape that call `oncancel`; verify `npx astro check` passes
- [x] 2.5 Implement Test (D7): validate, translate `'hello'` with the modal's own translator, show the `idle | testing | ok | error` state, disable Test while testing, reset to idle on any form `input`, and call `translator.cancel()` on teardown; verify `npx astro check` passes
- [x] 2.6 Show the session-only notice when `sessionOnly` is true, styled as information rather than an error; verify `npx astro check` passes
- [x] 2.7 Clear a field's error when it is edited, clear the pair error when either language changes, and drop `role="alert"` from field errors (D8); verify `npx astro check` passes (behaviour is checked manually in 4.2)
- [x] 2.8 Add the italic intro under the heading in both modes (D12); verify `npx astro check` passes (checked visually in 4.2)
- [x] 2.9 Seed base URL and model from `DEFAULT_PROVIDER` when `config` is null, drop the placeholders, and add "×" clear buttons that show only while the field is non-empty and clear the value, the field's error, and the test result, then focus the input (D13); verify `npx astro check` passes (behaviour is checked manually in 4.2)
- [x] 2.10 Replace the "Select…" option with `<option value="" disabled hidden>` in both language selects (D14); verify `npx astro check` passes (behaviour is checked manually in 4.2)
- [x] 2.11 Rewrite the base URL field through `completeBaseUrl` on blur when it is non-empty (D2); verify `npx astro check` passes (behaviour is checked manually in 4.2)
- [x] 2.12 Cancel the in-flight test on any form input and in `clearField` (D7); verify `npx astro check` passes, then in DevTools with network throttling: Test followed by typing shows the request as cancelled
- [x] 2.13 Always render the `role="status"` element with only its text changing, and add `aria-describedby="setup-intro"` to the dialog (D7, D12); verify `npx astro check` passes

## 3. App wiring and docs

- [x] 3.1 Update `App.svelte` (D10): after loading, show the blocking modal when config is `null`; otherwise show the configured placeholder plus a Settings button that opens the modal prefilled; `onsave` awaits `storage.save`, updates `config`, and closes the modal; pass `sessionOnly={$inmemoryFallback}`; verify `npx astro check` passes and `npx astro build` succeeds
- [x] 3.2 Update `AGENTS.md` Structure: describe `SetupModal.svelte` (drop *planned*), add `setup.ts` and `setup.test.ts`, and update the `App.svelte` line; verify the listed files exist
- [x] 3.3 Remove the done setup-modal items from `TODO.md` current work (plan item, https base URL note); verify `TODO.md` no longer lists them

## 4. Integration checks

- [x] 4.1 Run `npx vitest run && npx tsc --noEmit && npx astro check`; verify all tests pass and types are clean
- [x] 4.2 Manual check (user-run, needs a real key) in `astro dev`, both top-level and inside a plain iframe:
  - the pair row shows the icon between the two selects without wrapping;
  - fixing a field clears its error;
  - typing `api.openai.com/v1` and tabbing out shows `https://api.openai.com/v1`;
  - the intro is shown under the heading;
  - first run prefills the base URL and model, and "×" clears and focuses a field;
  - both language lists start with Polish, English, and an unchosen language shows "Select…", which is absent from the list (greyed out at most in Safari);
  - first visit shows the blocking modal, and repeated Escape does not close it;
  - invalid input (remote `http://`, empty model, key with a space, same language twice) shows per-field errors;
  - Test reports success with a real key and the key-rejected message with a wrong one;
  - Save closes the modal, and a reload skips it;
  - Settings opens the modal prefilled, and Cancel or Escape discards edits;
  - a private window where IDB is blocked (or Safari in an iframe) shows the session-only notice.

## Workflow follow-up

- Propose a commit after planning, after apply, and after archive (three commits).
- Archive the change once tasks are complete and the user has reviewed the spec.
- At archive, tick `setup-modal` in the `context.md` roadmap.
