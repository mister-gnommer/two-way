# Proposal

## Why

After real use, the app works but looks unfinished. Standalone, it is a bare form with a large serif-weight title and an unstyled Settings button. Inside start.me, a lone textarea and button float in an otherwise empty widget. The project also has a logo (`public/two-way-icon.svg`) that the UI never uses, and the favicon is still Astro's default.

## What Changes

- **Command-bar input.** The panel's controls collapse into one pill-shaped bar: the pair chip on the left, then the input, a clear action while there is text, a Settings icon button, and the Translate button. Both layouts use the same bar.
- **The logo is the Translate button.** It's a round button showing the two-way logo, with the accessible name "Translate".
- **The input auto-grows.** It starts one row tall, grows with Shift+Enter lines up to a cap, then scrolls. The manual resize handle goes away. In both layouts the visible label becomes the placeholder; the label stays the accessible name.
- **Result card.** Outcomes appear in a card below the bar. Errors stay visually distinct.
- **Standalone layout.** A centred column with a header holding the logo and "two-way". The Settings text button is replaced by the in-bar Settings icon. **BREAKING** (UI only): the standalone Settings text button and the visible input label are removed.
- **Embed layout.** The corner gear and the separate two-row resizable input go away, because the shared bar now covers both. Embed keeps hiding the header and using the frame's full width.
- **Teal theme.** The accent colour becomes teal in both schemes, picked for readable contrast. The logo always sits on a dark tile, because its ivory arrow vanishes on light backgrounds.
- **Favicon.** The favicon becomes the logo.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `translation`: the panel's controls sit in one input bar (pair indicator, input, clear, Settings, Translate shown as the logo), the input is labelled by its placeholder in both layouts, and the input grows with its content.
- `embedding`: the full layout's title and Settings button are replaced by the header, the width cap changes, and the embed-only input and gear requirements are removed because the shared bar replaces them.
- `presentation`: adds the teal accent, the logo (on a dark tile) and the standalone header.

## Impact

- Code: `src/components/TranslatePanel.svelte` (bar, auto-grow, result card, `onsettings` callback), `src/components/App.svelte` (header with logo; gear and Settings button removed), `src/styles/theme.css` (teal tokens, logo tile token), `src/pages/index.astro` (favicon links, embed inset).
- Assets: `public/favicon.svg` and `public/favicon.ico` are regenerated from `public/two-way-icon.svg`.
- No change to provider, storage, prompt or setup logic, and no new dependencies. Unit tests are unaffected: display helpers keep their output.
- Docs: `README.md` (embedding notes, if they describe the layout), `AGENTS.md` Structure, `context.md`.
