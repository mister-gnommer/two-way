## Why

The app works but has no look of its own. It uses the browser's default serif font and
hard-coded colours copied between components. On a dark start.me page it is a bright white
box. Two of the project's stated goals are also still open: a View Transitions animation for
the direction flip (`PL → EN` ↔ `EN → PL`) and a Cthulhu-class easter egg.

## What Changes

- **Theme that follows the system.** A shared set of CSS custom properties sets the page's
  colours, font and borders. It switches between light and dark with the OS setting
  (`prefers-color-scheme`). There is no toggle and nothing is stored. Each component's
  hard-coded colours, including the duplicated `--error-color` and `--border-color`, move to
  these shared properties. The page uses a system UI font instead of the browser default.
  This applies to the standalone page, embed mode and the setup modal.
- **Direction flip animation.** The direction label animates when a translation goes the
  other way from the previous one, e.g. `PL → EN` followed by `EN → PL`. A translation in
  the same direction, or the first one after loading, clearing or saving settings, shows
  with no animation. When the user prefers reduced motion, or the browser has no
  View Transitions support, the result appears at once.
- **R'lyehian easter egg.** Submitting the Cthulhu chant
  *"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn"* is matched loosely (ignoring case,
  extra spaces, apostrophe style and trailing punctuation). It is answered locally and never
  sent to the provider. The result reads *"In his house at R'lyeh dead Cthulhu waits
  dreaming."* with the direction `R'LYEHIAN → EN`. It has a short eldritch styling, which is
  static when the user prefers reduced motion. It works with any configured pair and costs
  no tokens.

## Capabilities

### New Capabilities

- `presentation`: the colour scheme and theme, the direction-flip animation and the easter
  egg.

### Modified Capabilities

- `translation`: "Detected direction is displayed" currently says only configured pair
  members are ever shown. The easter-egg reply becomes the one stated exception.

## Impact

- **Changed files**:
  - **New global theme stylesheet:**
    - imported by `src/pages/index.astro`;
    - defines `color-scheme`, the colour tokens, the font and the page background.
  - **`src/components/TranslatePanel.svelte`, `SetupModal.svelte` and `App.svelte`:**
    - use the shared tokens instead of local colours;
    - the panel runs the direction-flip transition and recognises the chant.
  - **New pure helper in `src/lib/`, with vitest tests:** chant matching and the easter-egg
    result view.
  - **Docs:** `AGENTS.md` (Structure), `TODO.md` (drop the token-duplication polish item),
    and the `context.md` roadmap.
- **No dependency changes.** View Transitions is a browser API, used through
  `document.startViewTransition` with a fallback when it is missing.
- **Not in scope:**
  - a manual theme toggle or a stored theme preference;
  - a transparent background that blends into the host page;
  - animating anything other than a direction change, such as crossfading every result;
  - Astro's page-navigation view transitions, which don't apply because the site has one
    page;
  - the polish-pass items in `TODO.md` other than token deduplication.
