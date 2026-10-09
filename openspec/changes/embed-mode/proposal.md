## Why

The main way the app is used is as a widget inside start.me's Embed widget, which is a plain
iframe, often a small box. The current page is laid out for top-level browsing: a "two-way"
title, a text Settings button, a visible input label, and a panel capped at 300 px with the
browser's default page margin. Inside a widget that wastes space the box doesn't have. Embed
mode makes the same page compact when it is framed, or when it is asked to with `?embed=1`.

## What Changes

- **Detection: `?embed=1` or framed.** Embed mode is on when the URL has `embed=1`, or when
  the page runs inside any iframe. Top-level without the parameter, the layout is unchanged.
- **Applied before first paint.** A tiny inline script in the page head marks the document as
  embedded, so the full layout never flashes inside the widget.
- **Compact layout** in embed mode:
  - the "two-way" title is hidden (start.me widgets have their own title bar);
  - the panel fills the frame's width instead of the 300 px cap, with no default page margin
    and only a small inset;
  - the input label is visually hidden but stays the input's accessible name, and the
    textarea shows it as a placeholder;
  - the textarea starts at 2 rows instead of 3, and can still be resized.
- **Settings as a gear icon.** Once configured, the Settings text button is replaced by a
  small gear icon button in the top-right corner, named "Settings" for assistive technology.
  It opens the same modal. Settings can't be dropped entirely: Chrome partitions iframe
  storage per embedding site, so the widget's config is separate from the standalone page's
  and can only be changed inside the widget.
- **Setup still works in the frame.** With no config, the blocking setup modal opens inside
  the iframe, as it does top-level. This is how a partitioned or blocked iframe gets its
  config. Nothing about setup changes; this change only states it for embed.
- **The site stays frameable.** No `X-Frame-Options` or CSP `frame-ancestors` that would
  block framing, now a stated requirement.

## Capabilities

### New Capabilities

- `embedding`: when the page counts as embedded, the compact layout, the gear Settings
  control, setup inside a frame, and keeping the site frameable. A later `postmessage-api`
  change extends this capability.

### Modified Capabilities

None. The setup spec already asks only for "a settings control", which the gear satisfies.
The translation panel's requirements hold in both layouts.

## Impact

- **Changed files**:
  - `src/pages/index.astro`: an inline head script sets the embed marker on `<html>`, plus the
    global compact rules (page margin, title).
  - `src/components/App.svelte`: reads the marker after mount, renders the gear button instead
    of the text button in embed, and passes `compact` to the panel.
  - `src/components/TranslatePanel.svelte`: new `compact` prop for fluid width, a hidden label
    with a placeholder, and 2 rows.
  - `AGENTS.md` (Structure and Embedding rules), `TODO.md`, `context.md` roadmap.
- **No new modules or unit tests.** The only logic is a one-line check inside the inline script,
  which vitest can't import. It is verified in the browser, both top-level and framed.
- **No dependency changes.**
- **Not in scope**:
  - the `postMessage` host API (`postmessage-api`);
  - theme and colours, including a transparent background to blend into start.me
    (`presentation`);
  - an `?embed=0` override to force the full layout while framed.
