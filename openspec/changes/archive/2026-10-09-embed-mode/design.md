## Context

See `proposal.md` (Why). The current state that shapes the approach:

- The site is static: `index.astro` is prerendered at build time, so the query string and
  the framing context are only known in the browser.
- `App.svelte` is a `client:load` island. Its prerendered markup is the "two-way" `<h1>` and
  the loading state. The panel and the Settings button render only after `storage.load()`
  resolves in `onMount`, so they are always client-rendered.
- `TranslatePanel.svelte` caps itself at `max-width: 300px`, uses a visible
  `<label for="translate-input">` and `rows="3"`, and already has a `.visually-hidden` class.
- `SetupModal.svelte` sizes its `<dialog>` as `width: min(340px, calc(100vw - 24px))` and
  `max-height: calc(100dvh - 24px)` with `overflow-y: auto`. Those caps apply to the content
  box, so its padding and border push it about 10 px past a short frame; D7 fixes that.
- There is no `vercel.json` and no header or CSP configuration anywhere, so nothing currently
  blocks framing.
- Project rules: vitest covers pure logic only; no type assertions;
  `svelte-check --fail-on-warnings` must pass; changes must be verified inside an iframe.

## Goals / Non-Goals

**Goals:**

- One source of truth for "is embedded", decided before first paint and read by both CSS
  and Svelte.
- The panel stays a self-contained component: compact behaviour is a prop, not CSS reaching
  into it from the page.

**Non-Goals:**

- No change to the setup spec. `SetupModal` changes only its box sizing (D7).
- No theme work, transparent background or colours (`presentation`).
- No `?embed=0` override, and no `postMessage` (`postmessage-api`).

## Decisions

**D1: An inline head script marks `<html data-embed>` before first paint.**
`index.astro` gets an `<script is:inline>` in `<head>` that sets
`document.documentElement.dataset.embed = ''` when either holds:

- `new URLSearchParams(location.search).get('embed') === '1'`;
- `window.self !== window.top`.

The check is wrapped in `try`, and a throw counts as framed: the only way it can throw is
an unusual sandboxed context, and that is an embedding anyway.

*Why:* the page is prerendered, so only the browser knows the answer. A synchronous script in
`<head>` runs before the body is parsed, so the CSS keyed on the attribute applies to the first
paint.

*Alternatives:*

- Read the flag in App's `onMount`. Rejected: the prerendered `<h1>` and default margin are
  painted until the island hydrates, which is a visible flash in the widget.
- Read it during App's script init. Rejected: the prerender has no `window`, so the markup
  would differ from hydration.
- An Astro-processed `<script>`. Rejected: it is bundled as a deferred module, which may run
  after first paint.

**D2: Page-level compact rules key on `:root[data-embed]`.**

- `index.astro` gets a global style: in embed mode the `body` has `margin: 0` and a small
  inset (`padding: 4px`).
- `App.svelte` hides its own `<h1>` with `:global(:root[data-embed]) h1 { display: none; }`.
  Each rule lives next to the markup it styles.

*Why:* these elements are prerendered, so CSS is the only way to style them before hydration
(D1).

*Alternative:* App wraps everything in an `.embed` class set after mount. Rejected for the
same flash reason as D1.

**D3: App reads the marker once in `onMount` and passes `compact` down.**
`let embed = $state(false)`. `onMount` first sets
`embed = document.documentElement.hasAttribute('data-embed')`, and then starts the config load.
The panel and the Settings control render only after the load resolves, so they always see the
final value, and nothing flashes.

*Why:* the attribute from D1 stays the single source of truth, and the detection rule is never
duplicated in TypeScript.

*Alternative:* a pure `isEmbedMode(search, framed)` in `src/lib/` with unit tests. Rejected:
the inline script can't import it, so the rule would exist twice and could drift. The rule is
one expression, and it is verified in the browser (tasks 3.x).

**D4: `TranslatePanel` takes a `compact` prop (default `false`).**
When `compact` is set:

- the section gets a `compact` class, which drops `max-width: 300px`;
- the `<label>` keeps `for="translate-input"` but gets the `visually-hidden` class, so it
  remains the accessible name;
- the textarea gets `placeholder="Text to translate"`, the same text as the label;
- the textarea starts with `rows={2}` instead of 3, and keeps `resize: vertical`.

*Why:* `rows` and `placeholder` are attributes, which CSS can't set, and a prop keeps the
panel's layout decisions inside the panel.

*Alternative:* page CSS reaches in with `:global(:root[data-embed]) .panel …`. Rejected: it
couples the panel to the page markup and can't set attributes.

**D5: The embed Settings control is an icon button with an inline SVG gear.**
In embed mode, App renders `<button class="gear" aria-label="Settings" title="Settings">`
containing an `aria-hidden` inline SVG gear (`currentColor`, about 16 px), instead of the text
button.

- It is positioned absolutely at the top-right of a `position: relative` wrapper around the
  panel, level with the pair indicator.
- Its hit area is at least 24×24 px, the WCAG 2.2 target-size minimum.
- It calls the same `settingsOpen = true` as the text button.

*Why:* an SVG renders the same on every platform and follows the text colour.

*Alternatives:*

- The Unicode ⚙ character. Rejected: many platforms render it as a colour emoji, and its
  size and baseline vary.
- An icon font or package. Rejected: a dependency for one glyph.

**D6: No unit tests in this change. Verification is in the browser.**
No new pure logic exists after D3. The checks run in `astro dev` through the T3 preview,
which covers four cases:

- top-level, plain;
- top-level, `?embed=1`;
- framed: a harness page on another origin (`127.0.0.1`) with an `<iframe>` to `localhost`;
- frame sizes from 250 px to 500 px wide, including a 300×250 frame for the setup modal.

Framing headers are checked on `astro preview` responses and in `dist/` (no
`X-Frame-Options`, no CSP `frame-ancestors`, no `<meta http-equiv>` CSP).

**D7: The setup dialog uses `box-sizing: border-box`.**
Browser checks found that the 300×250 px frame clipped the dialog. Its `max-height` cap
applied to the content box, so the 16 px padding and the border made it 259 px tall. With
`border-box`, both caps include the padding, and the dialog fits the frame. *Why:* it is a
one-line fix that keeps both caps' intent, and the "Setup fits a small frame" scenario
requires it. *Alternative:* subtract the padding inside the `calc()`. Rejected: it duplicates
the padding value.

## Risks / Trade-offs

- [Any frame goes compact, such as previews or extension sidebars] → This is intended (the
  user chose "or framed"), and the compact layout stays fully functional. An `?embed=0`
  override is out of scope until something needs it.
- [Chrome partitions iframe storage per top-level site, so the widget needs its own setup;
  Safari and Brave may block storage, so setup repeats every visit] → The blocking setup
  works inside the frame, and the existing session-only disclosure explains the repeat.
  Nothing new to build.
- [The gear overlaps the pair indicator row in very narrow frames] → The pair text is short
  (`PL ↔ EN`), and the panel's top row gets right padding equal to the gear's width.
- [The inline script is plain JS outside the TypeScript and lint pipeline] → It is a few lines
  with no dependencies, and the browser checks in tasks cover all of its branches.
- [The Astro dev toolbar also renders inside the frame during `astro dev`] → Dev only, and it
  is not part of the build.

## Migration Plan

None. This is a static deploy on push. Rolling back reverts the commit, and the stored config
is untouched.
