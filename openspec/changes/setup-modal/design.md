## Context

See `proposal.md` (Why). The current state that shapes the approach:

- `App.svelte` creates the storage, awaits `storage.load()` in `onMount`, and renders
  placeholders for the loading, configured, and unconfigured states. `storage.loading` and
  `storage.inmemoryFallback` are `svelte/store` writables. `storage.save()` never rejects:
  it falls back to memory.
- `createTranslator()` never throws. It returns `translation`, `off-pair`, `error` (with
  fixed copy), guard rejections, or `aborted`. Its invalid-key message already points the
  user to "the settings".
- `AppConfig` is `{ provider: { baseUrl, model, apiKey }, pair: { a, b } }`, saved whole.
  The provider strips trailing slashes from the base URL.
- Project rules: Svelte 5 runes, plain CSS, vitest for pure logic only, components need no
  coverage, no type assertions, and changes must be checked inside an iframe.

## Goals / Non-Goals

**Goals:**

- All validation rules live in a pure module that vitest can test. The component only
  wires state to it.
- Every time the modal opens, it starts from the saved config. Discarded edits never
  survive a cancel.
- The blocking modal really blocks: no backdrop click and no Escape (even repeated) gets
  past it.

**Non-Goals:**

- No component tests and no DOM testing library.
- No provider presets and no model list fetched from `/models`.
- No styling beyond a usable vertical layout (theme comes with `presentation`).

## Decisions

**D1: Validation is a pure function in `src/lib/setup.ts`.**
`validateSetup(form)` takes the raw form strings `{ baseUrl, model, apiKey, langA, langB }`
and returns either `{ ok: true, config: AppConfig }` (trimmed values) or
`{ ok: false, errors }`, where `errors` maps each failing field to one message. Save and
Test both call it first. *Why:* the rules are the part that can be wrong, and a pure
function covers them with plain unit tests. *Alternative:* validate inline in the
component with HTML constraint attributes (`required`, `type="url"`, `pattern`). Rejected:
`type="url"` accepts `http:` and decorated URLs, and the rules would be untestable under
the project's "pure logic only" testing policy.

**D2: Base URL rule.** Trim the URL and complete it with `completeBaseUrl`, which
prepends `https://` when the input does not match `/^[a-z][a-z0-9+.-]*:\/\//i`. Then parse
it with `new URL()` inside a try/catch, and require:

- protocol `https:`, or `http:` with hostname `localhost`, `127.0.0.1`, or `[::1]`
  (`URL.hostname` keeps the brackets on IPv6);
- empty `username` and `password`;
- empty `search` and `hash`, and no `?` or `#` anywhere in the trimmed string. `URL`
  reports a bare `?` or `#` as an empty query or fragment, but the provider appends
  to the string exactly as typed.

The trimmed input string is saved as typed, after scheme completion, not `url.href`, so
the user sees what they entered. *Why match on `://` for completion:*
`new URL('localhost:11434/v1')` does not fail, because it parses `localhost:` as the
scheme. `validateSetup` completes the URL, which covers saving with Enter, and the
component also rewrites the field on blur when it is non-empty, so the user sees the
result. Malformed input still fails after completion: `not a url` becomes
`https://not a url`, which `URL` rejects. *Alternative:* prepend `http://` for loopback
hosts. Rejected as a hidden special case; anyone running a local server can type the
scheme. Trailing slashes are already handled by the provider. *Why loopback over
http:* local servers (Ollama, LM Studio) rarely run TLS, and loopback traffic never leaves
the machine. *Why no query or fragment:* the provider appends `/chat/completions`, which
would land inside the query or fragment.

**D3: API key rule is visible ASCII, `/^[\x21-\x7E]+$/` after trimming.** *Why:* real
provider keys are ASCII. This is stricter than the provider's `Headers` check, which
accepts Latin-1 and inner spaces, so typographic quotes, NBSPs, and pasted line breaks are
caught at setup time with a field error instead of at the first translation. The message
is fixed copy and never contains the key.

**D4: The curated language list is primary-language tags only, labelled with
`Intl.DisplayNames`.** `LANGUAGES` holds about 35 tags: `ar bg cs da de el en es et fi fr
he hi hr hu id it ja ko lt lv nl no pl pt ro ru sk sl sr sv th tr uk vi zh`. Labels come
from `new Intl.DisplayNames(['en'], { type: 'language' })` (English, to match the
English-only UI copy) and the options are sorted by label. `languageOptions(saved)`
returns the list plus any saved tag that is not in it, labelled the same way (falling back
to the tag itself), so a saved `pl-PL` stays selectable. `pl` and `en` are pinned first,
in that order. Everything else, including unlisted saved tags, follows sorted by label. *Why primary tags only:* two
different list entries can then never share a primary subtag, which is the assumption
`translate-core` deferred to setup. The only pair check left is "different values".
*Alternative:* include regional variants (`en-GB`, `pt-BR`). Rejected for beta, since it
would bring back the same-primary-subtag check and a longer list.

**D5: The modal is a native `<dialog>` opened with `showModal()`.** It gives a focus
trap, an inert background, the top layer, and Escape handling for free. Blocking mode:

- `cancel` events are `preventDefault()`-ed;
- a `close` handler reopens the dialog while no config exists. Chrome's close-watcher
  rules let a second Escape without user activation close the dialog despite
  `preventDefault`, so the cancel guard alone is not enough;
- there is no cancel button and no backdrop dismissal.

In reopened mode, Escape and the Cancel button both call `oncancel`. *Alternative:* a
hand-rolled overlay `<div>`. Rejected because it needs a manual focus trap and `inert`
handling. *Alternative:* the `closedby="none"` attribute. Not relied on, because browser
support is still uneven. It may be added as a harmless extra.

**D6: App owns storage and config; the modal owns the form and the test.**
`SetupModal` props are `config: AppConfig | null` (initial values), `blocking: boolean`,
`sessionOnly: boolean`, `onsave(config)`, and `oncancel()`. App renders the modal with
`{#if}` only while it is open, so each opening mounts a fresh component whose `$state` is
seeded from `config`. Discarded edits disappear with the unmounted instance, which needs
no reset logic. The modal creates its own translator and calls `translator.cancel()` in
its teardown, so saving or cancelling during a test drops the test result. *Alternative:*
keep the modal mounted and toggle `open`. Rejected because it needs explicit form resets
and test cancellation on every close.

**D7: The test call translates a fixed word and treats any provider answer as success.**
Test validates (D1) and then calls `translator.translate(config, 'hello')`. Results map
as follows:

- `translation` / `off-pair` → "Connection works";
- `error` → its message;
- `aborted` → ignored.

`blank` / `too-long` cannot occur with a constant input. *Why off-pair counts:* for a pair
without English, "hello" is legitimately off-pair, and that answer still proves the key,
URL, CORS, and structured output all work. Test state is
`idle | testing | ok | error(message)`. Any `input` event on the form resets it to `idle`,
and the Test button is disabled while `testing`. That same `input` handler and
`clearField` also call `translator.cancel()`, so an edit stops the request instead of
only hiding its result. The `role="status"` paragraph is always rendered and only its
text changes (empty while idle): many screen readers ignore a live region inserted
together with its content.

**D8: Save is validate → `onsave` → close.** App's `onsave` awaits `storage.save(config)`,
sets its `config` state, and closes the modal. Save is disabled while that is pending, so
a double click cannot write twice. Validation errors render next to their fields
(`aria-invalid` + `aria-describedby`). No request is sent and nothing is saved while any
error exists. Editing a field clears only that field's error, and editing either language
also clears the pair error; everything is re-checked on the next Save or Test. Field
errors carry no `role="alert"`: `aria-describedby` already ties each one to its field,
and several live regions firing at once would be read out together.

**D9: API key field hygiene.** The field is `type="password"`, toggled to `text` by a
"Show" button, with `autocomplete="off"`, `spellcheck="false"`, and
`autocapitalize="off"`. *Why:* it keeps the key off screen and out of spell-check
services. It also discourages password managers from storing it as a site password,
though some ignore `autocomplete="off"`, which is acceptable.

**D10: App layout states.** The page shows:

- while loading: `loading…`;
- with no config: the blocking modal over the minimal page;
- with a config: the existing configured placeholder plus a "Settings" button that
  opens the modal in reopened mode.

The session-only notice is passed in as `sessionOnly={$inmemoryFallback}`. The form is a
single vertical column with `max-width: 300px`, which fits the start.me widget.

**D11: The pair row is `[select A] [two-way icon] [select B]`.** The two language
selects sit on one row with the two-way arrow icon centred between them. The icon is
moved to `public/two-way-icon.svg` and rendered as
`<img src="/two-way-icon.svg" alt="" aria-hidden="true">` at about 32 px. It is
decorative: each select has its own label ("Language 1", "Language 2"). The selects
flex to share the remaining width. The longest English labels, such as "Indonesian" or
"Lithuanian", fit in about 120 px each within the 300 px column. *Why `public/`:* it is
a static file with no build processing, and the same file can serve as a logo or favicon
later. *Alternative:* importing it from `src/assets/` through Vite. Rejected, because
Astro turns image imports into metadata objects, which adds indirection in a Svelte
component for no gain.

**D12: The help is a short italic intro under the heading.** The copy:

> *Type a word or short sentence in either language — two-way detects which one it is
> and translates it into the other. It uses your own OpenAI-compatible API key, which
> stays in this browser and is sent only to your provider.*

It is shown in both modes. The paragraph has `id="setup-intro"` and the `<dialog>`
points to it with `aria-describedby`, so screen readers read it when the modal opens.
*Why:* it is always visible on first run, which is when it is
needed, and it takes no interaction. *Alternatives:* a tooltip behind a "?" button.
Rejected, because hover does not work on touch, and a popover is awkward inside a small
iframe. An accordion was also rejected, because it hides the one thing a new user needs
to read. *Cost:* about three lines of height.

**D13: First-run prefills replace placeholders, with "×" clear buttons.**
`DEFAULT_PROVIDER = { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }` lives
in `setup.ts`. It seeds the form only when `config` is `null`, and the placeholders are
dropped. The base URL and model fields each get a `type="button"` "×" with
`aria-label="Clear base URL"` / `"Clear model"`, rendered only while the field is
non-empty. Setting the value programmatically fires no `input` event, so the button
itself clears that field's error and resets the test result, then focuses the input. The
API key gets no "×", because it is never prefilled and already has the Show toggle.
*Alternative:* `type="search"` inputs with the native clear button. Rejected because
Firefox has none and the styling is browser-specific.

**D14: The language prompt is `<option value="" disabled hidden>Select…</option>`.**
While the bound value is `''` the select shows this option, and `hidden` keeps it out of
the dropdown list in Chromium and Firefox. Safari may still list it, greyed out, and
`disabled` makes it impossible to pick there too. *Alternative:* default the pair to
`pl` / `en`. Not needed, because the prompt works, and keeping the field empty means a
first-run user has to choose deliberately.

## Risks / Trade-offs

- [Some browser closes the blocking dialog in an unforeseen way] → The D5 close handler
  reopens it whenever no config exists. The worst case is a flicker, not an unconfigured
  app.
- [The API key is visible in the DOM of the reopened modal (masked input value)] → It is
  already in page memory and IDB (BYOK). Masking plus no logging is the available
  mitigation.
- [Each Test click spends a few tokens] → It only runs on an explicit click. Saving never
  calls the provider.
- [A saved config can be broken because testing is optional] → This was chosen
  deliberately. The first translation shows the same fixed error copy, and the settings
  button is one click away.
- [The language list is English-labelled and limited to about 35 languages] → This is
  enough for beta. The list is data (D4) and easy to extend, and unlisted saved tags are
  preserved.
- [`Intl.DisplayNames` lacks a name for a tag] → The label falls back to the tag itself.

## Migration Plan

None. This is the first UI over existing storage. Existing saved configs, such as dev
records with `pl-PL`, keep working through D4's unlisted-tag preservation.
