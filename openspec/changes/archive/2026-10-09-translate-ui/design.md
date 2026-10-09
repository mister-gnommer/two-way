## Context

See `proposal.md` (Why). The current state that shapes the approach:

- `App.svelte` loads config through `createStorage()` and mounts `SetupModal` while
  unconfigured or while Settings is open. When configured, it shows only a placeholder
  `<p>` and the Settings button. `handleSave` assigns a new `AppConfig` object on every
  save.
- `createTranslator()` is latest-wins and never throws. It resolves to:
  - `translation` with `source` and `target` as pair members;
  - `off-pair`;
  - `error`, with fixed copy and the input;
  - `blank` or `too-long`, from the input guard, which it runs itself before any request;
  - `aborted`, for a superseded or cancelled call.
- `setup.ts` already names languages through a private `labelFor`, which wraps
  `Intl.DisplayNames(['en'])`.
- `SetupModal` has two patterns worth reusing:
  - a `role="status"` region that is always rendered, because a live region inserted
    together with its text is often not announced;
  - "×" clear buttons that clear state themselves, because setting a value from code
    fires no `input` event.
- Project rules:
  - vitest covers pure logic only, and components have no coverage requirement;
  - no type assertions;
  - `svelte-check --fail-on-warnings` must pass;
  - changes must be verified inside an iframe.

## Goals / Non-Goals

**Goals:**

- Every outcome-to-display decision lives in a pure, tested function. The component only
  wires events and state to it.
- The panel works the same top-level and inside a cross-origin iframe, the copy action
  included.

**Non-Goals:**

- No compact or `?embed=1` layout and no hidden chrome (`embed-mode`).
- No theme and no direction-flip animation (`presentation`). The direction element only
  stays a stable node, so a view transition can target it later.
- No autofocus on load: browsers block it in cross-origin iframes anyway, and stealing
  focus from a start page is hostile.

## Decisions

**D1: New `TranslatePanel.svelte` with a single `config` prop; Settings stays in App.**
App renders `<TranslatePanel {config} />` in place of the placeholder when `config` is
set. The modal and the Settings button stay where they are. *Why:* `embed-mode` will hide
the Settings chrome in App without touching the panel, and the panel owns its translator
and result state. *Alternative:* build the panel into `App.svelte`. Rejected: App
would mix storage, modal and translation state.

**D2: Pure display helpers in `src/lib/translate-view.ts`.**

- `shortTag(tag)` returns the uppercased primary subtag (`pl-PL` → `PL`).
- `pairLabel(pair)` returns `{ text: 'PL ↔ EN', name: 'Polish ↔ English' }`.
- `directionLabel(source, target)` returns `{ text: 'PL → EN', name: 'Polish → English' }`.
- `resultView(outcome)` maps a `ProviderResult` to a `ResultView`:
  - `translation` → `{ kind: 'translation', text, lang: target, direction }`;
  - `off-pair`, `blank` and `too-long` → `{ kind: 'notice', message }`;
  - `error` → `{ kind: 'error', message }`;
  - `aborted` → `null`, meaning "leave the shown state alone".

The panel's own states `idle` and `translating` complete the `ResultView` union. Names
come from `languageLabel`, which is `setup.ts`'s `labelFor`, exported and renamed, so the
dropdowns and the panel always agree.

*Why:* the mapping and the labels are the parts that can be wrong, for example a regional
tag, the `aborted` case, or an off-pair result styled as an error. A pure function keeps
them under unit tests. *Alternative:* a `switch` inside the component. Rejected: it is
untestable under the project's testing policy.

**D3: Submit is a `<form>` submit; Enter is mapped in `keydown`.**
The textarea and the Translate button share one `<form>`. `keydown` on the textarea calls
`preventDefault()` and `form.requestSubmit()` when all of these hold:

- the key is Enter;
- Shift is not held;
- no IME composition is active: `!event.isComposing && event.keyCode !== 229`. Safari
  reports `isComposing: false` on the Enter that ends a composition, and `keyCode 229` is
  the standard guard. Add a comment saying why.

Blank input still submits: the translator's guard returns `blank`, and its message is
shown (D2). *Why:* the button and Enter share one code path, which is also what
`requestSubmit` gives the button. *Alternative:* a `maxlength` attribute or a disabled
button for blank input. Rejected: `maxlength` counts untrimmed characters and silently
truncates pastes, and the guard already returns the right message.

**D4: Request lifecycle relies on the translator's latest-wins contract.**
One `createTranslator()` per panel instance; `onMount` returns `translator.cancel` for
teardown. A submit runs these steps:

1. Set the view to `translating`.
2. `await translator.translate(config, input)`.
3. Apply `resultView(outcome)` unless it is `null`.

A superseded call resolves `aborted` and is ignored, so no request id is needed. Clear and
the settings reset (D5) call `cancel()` and then set `idle`. The pending call then
resolves `aborted`, so a late answer cannot overwrite them. The input is bound state that
the submit path never writes.

**D5: Settings save resets through an `$effect` on `config`.**
An effect that tracks only `config` runs `translator.cancel()` and sets the view to `idle`,
with the body wrapped in `untrack` so that it does not depend on the view. It also runs at
mount, where it is a no-op. A cancelled modal leaves `config` untouched, so the effect does
not run. Saving identical values assigns a new object, so it does reset. That is acceptable,
because the user did save.

*Alternatives:*

- `{#key config}` remounts the panel. Rejected: it drops the input, which violates
  "input is never discarded".
- Tag each view with the config it came from and derive "stale → idle". Rejected: it
  hides the old result but leaves the request running, while the spec requires a cancel.

**D6: Copy uses the Clipboard API, then `execCommand('copy')`, then a manual hint.**

1. `navigator.clipboard.writeText(text)`.
2. On rejection or absence: select the translation element's text with a `Range` and
   run `document.execCommand('copy')`.
3. If that returns `false` or throws: keep the text selected and show "Press Ctrl+C
   (⌘C on Mac) to copy."

On success the button reads "Copied" for about 1.5 s. The timer is cleared on a new view
and on teardown.

*Why:* Chrome's `clipboard-write` Permissions Policy defaults to `self`, so in a
cross-origin iframe without `allow="clipboard-write"`, `writeText` rejects. We do not
control start.me's iframe attributes. `execCommand('copy')` is deprecated, but it is the
only programmatic copy that works without that permission. *Alternative:* the Clipboard
API only. Rejected, because it is likely broken in the primary use case.

**D7: Result area markup.**
The result area is a `<div role="status">` that is always rendered, with one child per
`ResultView` kind:

- `idle`: empty.
- `translating`: "Translating…".
- `translation`:
  - the direction label;
  - `<p lang={target}>` with the text, so screen readers pronounce it in the target
    language;
  - the Copy button.
- `notice`: neutral text.
- `error`: text in the `.error` style, using the same `--error-color` as setup.

The direction and pair labels render visible `text` with `aria-hidden="true"`,
visually-hidden `name`, and `title={name}`. `aria-label` on a plain `<span>` is ignored by
many screen readers. The previous result is replaced by "Translating…" rather than dimmed.
The Translate button stays enabled while a request is in flight, because a resubmit
supersedes it.

**D8: Input details.**

- The input is a `<textarea rows="3">` labelled "Text to translate".
- `spellcheck="false"`: the browser spellchecks in one language, and the user types in two.
- `autocomplete="off"`.
- Next to it, a "×" clear button rendered under `{#if input}`. It sets `input = ''`,
  focuses the textarea, cancels and sets `idle` (D4).

## Risks / Trade-offs

- [`execCommand` is deprecated and may be removed] → The manual-copy hint is the final
  fallback, so copy degrades instead of failing silently. `svelte-check` reports the
  deprecation as a hint at most. If it reports a warning instead, wrap the call in a small
  helper with a comment.
- [`keyCode` is deprecated] → Same treatment. It is used only as the Safari IME guard
  (D3).
- [The result stays visible while the user edits the input, so it can describe older
  text] → The direction label and the explicit submit make the boundary clear. An
  auto-clear on edit would flicker while the user is correcting a typo.
- [Saving unchanged settings clears the result] → This is rare and harmless; D5 accepts
  it.
- [The copy fallback cannot be checked on start.me itself] → Verify in a local
  cross-origin iframe without an `allow` attribute, for example the built site served
  on two ports.

## Migration Plan

None. Static deploy; rollback is reverting the commit.
