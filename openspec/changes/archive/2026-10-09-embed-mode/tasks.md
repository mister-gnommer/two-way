## 1. Embed marker and page-level compact rules

- [x] 1.1 Add an `<script is:inline>` to `<head>` in `src/pages/index.astro` that sets `data-embed` on `<html>` when `embed=1` is in the query, or the page is framed, with a throw counting as framed (D1). Add a global style that drops the body margin to a 4 px inset under `:root[data-embed]` (D2). Verify that `npx astro build` succeeds and that `dist/index.html` has the inline script in `<head>` before any body content.
- [x] 1.2 In `src/components/App.svelte`, hide the `<h1>` with `:global(:root[data-embed]) h1` (D2). Verify `npx svelte-check --fail-on-warnings` passes. The no-flash behaviour is checked in 3.2.

## 2. Compact panel and gear Settings

- [x] 2.1 Add the `compact` prop to `src/components/TranslatePanel.svelte`, defaulting to `false` (D4): a `compact` class that drops the 300 px cap, a visually-hidden label, `placeholder="Text to translate"`, and `rows` of 2 instead of 3. Verify `npx svelte-check --fail-on-warnings` passes.
- [x] 2.2 In `App.svelte`, set `embed` from `data-embed` at the start of `onMount`, before the config load. Pass `compact={embed}` to the panel. In embed mode, render the inline-SVG gear button (`aria-label`/`title` "Settings", hit area at least 24×24 px, top-right of a `position: relative` wrapper) instead of the text button, and pad the panel's top row so the gear does not overlap the pair indicator (D3, D5). Verify `npx svelte-check --fail-on-warnings` passes.
- [x] 2.3 Update `AGENTS.md`:
  - Structure: the `index.astro` line (inline embed marker), the `App.svelte` line (gear in embed) and the `TranslatePanel.svelte` line (`compact` prop);
  - Embedding rules: embed is `?embed=1` or framed, marked by `data-embed` on `<html>`.

  Remove `plan embed-mode` from `TODO.md` current work. Verify that every file listed in `AGENTS.md` exists.

## 3. Integration checks

- [x] 3.1 Run `npx vitest run && npx tsc --noEmit && npx svelte-check --fail-on-warnings && npx astro check`; verify all pass with 0 warnings
- [x] 3.2 Browser check in `astro dev` through the T3 preview (D6):
  - Top-level, plain: the title, the Settings text button, the visible label, 3 rows and the 300 px cap are all unchanged; `?embed=0` gives the same.
  - Top-level with `?embed=1`:
    - there is no title, the body margin is 0, and the panel spans the width;
    - the label is not visible, the placeholder reads "Text to translate", and the textarea's accessible name is still "Text to translate";
    - the textarea has 2 rows;
    - the gear sits top-right, does not overlap `PL ↔ EN`, and opens a prefilled, cancellable modal.
  - No flash: with `?embed=1` and the network throttled, the `<h1>` is never visible, because the attribute is set before the island loads.
  - Framed: a harness page on `127.0.0.1` with an iframe to `localhost` and no `allow` attribute:
    - the compact layout shows without any parameter;
    - with empty frame storage, the blocking setup modal opens inside the frame;
    - after setup, a translation works.
  - Sizes:
    - a 500 px frame: the input spans the frame;
    - a 250 px frame: no horizontal scroll;
    - a 300×250 px frame: the setup modal fits its width and every field and button is reachable by scrolling.
- [x] 3.3 Run `npx astro build && npx astro preview`, then fetch `/` with `curl -sI`; verify there is no `X-Frame-Options` and no CSP `frame-ancestors` header, and that `dist/` has no `<meta http-equiv="Content-Security-Policy">`

## Workflow follow-up

- Propose a commit after planning, after apply, and after archive (three commits).
- Archive the change once tasks are complete and the user has reviewed the spec.
- At archive, tick `embed-mode` in the `context.md` roadmap and set the next `TODO.md` item to `plan presentation`.
