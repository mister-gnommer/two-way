# Tasks

## 1. Theme and assets

- [ ] 1.1 In `src/styles/theme.css`, set the teal accent tokens and add `--color-accent-soft`, `--color-accent-soft-text` and `--color-logo-tile` (design D6). Verify each text pair from the D6 table meets 4.5:1 with a contrast script, and that the existing placeholder (`--color-muted` on `--color-surface`) still does in both schemes.
- [ ] 1.2 Replace `public/favicon.svg` with the logo on a dark rounded tile and regenerate `public/favicon.ico` at 16, 32 and 48 px with ImageMagick (D9). Verify `magick identify public/favicon.ico` lists three sizes, and that the built page's tab shows the logo.

## 2. Input bar and result card

- [ ] 2.1 In `TranslatePanel.svelte`, replace the label row, the input row and the Translate row with one bar: the pair chip, the textarea (`rows="1"`, `resize: none`, visually hidden label, placeholder in every layout), clear `×` while there is text, a Settings ghost button (`aria-label="Settings"`, calling a new `onsettings` prop), and a logo submit button (`aria-label="Translate"`, `<img alt="">`) (D2, D4, D5). Drop the `compact` prop (D1). Verify `npx svelte-check --fail-on-warnings` passes.
- [ ] 2.2 Add auto-grow: an `$effect` on `input` sets the height to `auto` and then to `scrollHeight`, capped at 6 rows by CSS `max-height` with scrolling (D3). Verify in the browser: an empty input is one row, Shift+Enter makes two rows with no request, ten lines stay at six rows and scroll, and clear returns to one row.
- [ ] 2.3 Render non-idle results inside a `.card` inside the permanently rendered `role="status"` wrapper. Give errors the error border and colour, and keep `view-transition-name: direction` on the direction label (D7). Verify no card is visible before the first submit, an error looks distinct from a translation, and the direction flip still animates (`kawa`, then `coffee`).
- [ ] 2.4 Add `:focus-visible` teal rings and hover and active states to the bar's buttons, with at least 8 px between Settings and Translate (D5). Verify by tabbing through the bar in both schemes that each button shows a visible ring.

## 3. App shell and layouts

- [ ] 3.1 In `App.svelte`, remove the gear, the Settings text button and the `embed` state. Pass `onsettings` to the panel. Put the logo tile and "two-way" in the `<h1>`, and centre the standalone column with a cap of about 560 px (D1, D8). Verify top-level shows the header and the centred bar, and that the Settings icon opens a prefilled, dismissible modal.
- [ ] 3.2 In `index.astro`, change the embed inset from 4 px to 8 px (D10). Verify that with `?embed=1` and inside an iframe harness, the header never paints, the bar spans a 900 px frame, a 250 px frame has no horizontal scroll, and the focus ring and card shadow aren't clipped.
- [ ] 3.3 Run `npx vitest run && npx tsc --noEmit && npx svelte-check --fail-on-warnings`. Verify all three pass with no warnings.

## 4. Docs

- [ ] 4.1 Update the docs:
  - `AGENTS.md` Structure: the App shell has no gear or `embed` state, `TranslatePanel` has the bar, auto-grow, the `onsettings` prop and no `compact` prop, and `theme.css` has the teal tokens. Also update the Embedding rules line about "shrinks Settings to a gear icon".
  - `README.md` Embed section: the Settings icon sits in the input bar.
  - `context.md`: the compact layout and settings chrome notes.

  Verify with `grep -n -i "gear\|compact\|Settings text" AGENTS.md README.md context.md` that nothing stale remains.

## 5. Integration check

- [ ] 5.1 Manual pass in the T3 preview, top-level and in an iframe harness, in light and dark schemes:
  - the full submit flow by Enter and by the logo button;
  - IME Enter does not submit;
  - a superseded request is never shown;
  - copy, including the iframe fallback;
  - clear;
  - Settings save resets the result and the pair chip shows the new pair;
  - first-run blocking setup in a 300×250 frame;
  - the R'lyehian chant keeps its eldritch styling inside the card.

  Record any deviation in this task before ticking it.

## Workflow follow-up

- Propose the planning commit now (artifacts complete).
- After apply: run OpenSpec verification and a code review, resolve findings, rerun checks, then propose the implementation commit.
- After archive (main specs synced, change archived): propose the archive commit.
