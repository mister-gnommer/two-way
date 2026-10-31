# Design

## Context

See proposal.md for the motivation. Today `TranslatePanel` takes a `compact` prop. The prop switches the visible label to a placeholder, sets the input to 2 or 3 rows and lifts the 300 px cap. `App` renders the Settings control itself: a corner gear in embed mode, a text button otherwise. Embed mode is decided once by the inline head script (`data-embed` on `<html>`), and CSS keys on `:root[data-embed]`. The panel's View Transition (`view-transition-name: direction`), copy fallback, live region and eldritch styling must keep working as before.

## Goals / Non-Goals

**Goals:**
- One panel markup for both layouts. The two layouts differ only in page-level CSS.
- Keep every existing panel behaviour, including submit keys, IME, supersession, copy fallback and the direction animation.

**Non-Goals:**
- Filling the widget's full height. The empty space below the card is accepted.
- A busy animation on the logo button while translating. The "Translating…" text stays in the result card.
- Restyling the setup modal beyond what the new tokens change on their own.
- Retinting the notice and error colours.

## Decisions

**D1 — Drop the `compact` prop and make the layout difference CSS-only.** Once the bar, placeholder and auto-grow are shared, the only embed differences left are the hidden header, the full width and the page inset. All three are already keyed on `:root[data-embed]`. `App` stops reading `data-embed` and stops holding `embed` state. *Alternative:* keep `compact` for the width. Rejected because it would duplicate the CSS source of truth that AGENTS.md mandates.

**D2 — The panel owns the Settings button through an `onsettings` callback prop.** The gear sits inside the bar, which `TranslatePanel` renders, so `App` passes `onsettings={() => (settingsOpen = true)}` and the modal wiring stays in `App`. *Alternative:* a snippet slot for the gear. Rejected as more indirection for one button.

**D3 — Auto-grow with a small script instead of `field-sizing: content`.** On every input change, an `$effect` sets the textarea's height to `auto` and then to `scrollHeight`. CSS caps it at `max-height: calc(6lh + padding)` with `overflow-y: auto`, and the textarea has `rows="1"` and `resize: none`. Clearing goes through the same effect, so the input shrinks back. *Alternative:* `field-sizing: content`. Rejected because it isn't supported everywhere yet, and where it's missing the input would stay one row and hide its lines.

**D4 — The bar's shape comes from a fixed radius.** The bar has a border radius of about half its single-row height (≈20 px). On one row that reads as a pill; as the input grows, it becomes a rounded rectangle without any state. The controls use `align-items: flex-end`, so the buttons stay on the last row, while the pair chip uses `align-self: flex-start`. The bar takes the input's focus ring (`:focus-within`). The textarea itself has no border or outline.

**D5 — The logo button is a native submit button.** It's `<button type="submit" aria-label="Translate">` wrapping `<img src="/two-way-icon.svg" alt="">`, on a round tile coloured by `--color-logo-tile`. A plain submit button keeps the existing `form.requestSubmit()` path and the "activates the Translate button" scenarios unchanged. It gets a `:focus-visible` teal outline with an offset, plus hover and active states (slight lift or brightness), so it reads as clickable. The Settings and clear buttons are ghost icon buttons with the same focus ring. A gap of at least 8 px separates Settings from Translate to reduce misclicks.

**D6 — New tokens in `theme.css`; all contrast pairs computed.**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-accent` | `#1f7f76` | `#5fd3c6` | focus ring, links (4.8:1 on white) |
| `--color-on-accent` | `#fff` | `#0d2724` | text on accent (8.7:1 dark) |
| `--color-accent-soft` | `#e3f4f2` | `#173633` | pair chip background |
| `--color-accent-soft-text` | `#17675f` | `#9be6dc` | pair chip text (5.9:1 / 9.2:1) |
| `--color-logo-tile` | `#1d2a2e` | `#0f1419` | logo tile |

The logo's own teal (`#2ca99d`) stays inside the SVG only. White text on it is 2.9:1, so it isn't used as a UI colour. Existing text, border, error and notice tokens stay as they are.

**D7 — The result card is drawn inside the live region, not on it.** The `role="status"` wrapper stays permanently rendered and unstyled, which avoids the live-region pitfall. Each non-idle branch renders inside an inner `.card` element, so no empty card appears before the first submit and nothing relies on `:empty`. Errors keep `--color-error` text, plus an error-coloured left border so they stand apart from translations. `view-transition-name: direction` stays on the direction label.

**D8 — The standalone header lives in `App`'s `<h1>`.** The `<h1>` holds the logo on a rounded tile next to "two-way". The existing prerendered `:root[data-embed] h1 { display: none }` rule keeps hiding it before first paint. The standalone column is centred with a cap of about 560 px.

**D9 — The favicon is the logo on a dark rounded tile.** A bare logo would lose its ivory arrow on a light tab strip, as in the presentation spec. `public/favicon.svg` becomes the tile plus logo. `public/favicon.ico` is regenerated from it with ImageMagick at 16, 32 and 48 px.

**D10 — Embed inset grows from 4 px to 8 px.** The bar's focus ring and the card's shadow would otherwise clip at the frame's edge.

## Risks / Trade-offs

- [The logo may not read as a button to first-time users] → Hover, active and focus states (D5) and its spot at the end of the bar where send buttons usually sit. Enter submits regardless.
- [The dark logo tile has low contrast against the dark-scheme bar] → The logo's arrows themselves stay high-contrast. A 1 px `--color-border` ring is added on the tile in the dark scheme if it looks lost during manual checks.
- [A tall auto-grown input in a short start.me frame] → It's capped at six rows. Beyond that, the frame scrolls as it does today.
- [Removing `compact` touches the embed path] → Manual checks run inside an iframe and with `?embed=1`, in both schemes, as AGENTS.md requires.

## Migration Plan

Static deploy on merge to `main`; no stored data changes. Rollback is a revert.
