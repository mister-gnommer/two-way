## Context

See `proposal.md` (Why). The current state that shapes the approach:

- **No global stylesheet.** The only global CSS is the `:root[data-embed] body` rule in
  `index.astro`, so the body uses the browser's default serif font and margin.
- **Colours are hard-coded hex in component `<style>` blocks:**
  - `TranslatePanel.svelte` and `SetupModal.svelte` each declare `--error-color` and
    `--border-color` locally;
  - both use `#fff` control backgrounds, `#555` muted text and `#111` dialog text;
  - `SetupModal.svelte` also has a green status colour and a blue-grey notice box.
- **`TranslatePanel` drives the result area** through one `show(next)` function, and
  `reset()` runs on clear and on a config change. A translation is
  `ResultView { kind: 'translation', text, lang, direction }`. Copy works only for
  `kind === 'translation'`.
- **What sits where during a request:** while a request is in flight, the result area shows
  only "Translating…", so the previous direction label is not on screen when the new outcome
  arrives.
- **Svelte batching:** state changes reach the DOM in a microtask unless flushed with
  `flushSync`.
- **Project rules:**
  - vitest covers pure logic only;
  - no type assertions;
  - `svelte-check --fail-on-warnings` must pass;
  - changes must be verified framed as well as top-level.

## Goals / Non-Goals

**Goals:**

- One place, a global stylesheet, defines every colour and the font. Components only
  reference tokens.
- The two new behaviours stay inside `TranslatePanel`. Only the chant matching, which is
  pure logic, moves to `src/lib` with tests.

**Non-Goals:**

- No palette beyond what the existing UI needs: no new components, icons or layout changes.
- No change to the provider, storage or setup logic.

## Decisions

**D1: A global `src/styles/theme.css`, imported in `index.astro`'s frontmatter, built on
`color-scheme: light dark` and `light-dark()` tokens.**

```css
:root {
  color-scheme: light dark;
  --color-bg: light-dark(…, …);
  --font-ui: system-ui, sans-serif;
  /* … */
}
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-ui);
}
```

- **Tokens (names fixed, values tuned in the browser):**
  - `--color-bg`, `--color-surface` (controls and dialog), `--color-text`, `--color-muted`;
  - `--color-border`, `--color-error`, `--color-success`;
  - `--color-notice-bg`, `--color-notice-border`, `--color-notice-text`;
  - `--color-accent`, `--color-on-accent`, `--color-eldritch`;
  - `--font-ui`.
- **Contrast:** values are chosen so every text and background pair is at least 4.5:1 in
  both schemes. Task 4.2 measures this.
- **Native controls:** `color-scheme` also gives native controls (select popups, scrollbars,
  the dialog) the matching scheme.
- **Load order:** Astro emits the imported CSS in `<head>`, so it applies to the first paint
  with no flash of the wrong scheme. Live OS changes are followed by the browser, with no JS.

*Alternatives:*

- Two `@media (prefers-color-scheme)` blocks that redefine each token. Rejected: every token
  is written twice, and `light-dark()` is Baseline 2024.
- A `<style is:global>` in `index.astro`. Rejected: a separate file is easier to find, and
  the existing embed rule can stay where embed-mode put it.

**D2: The page always paints `--color-bg`, including in embed mode.**

- **Why:** a transparent widget body would let start.me's background show through, which is
  out of scope.
- **Mismatched schemes:** when the iframe's scheme differs from the host's, browsers paint
  the iframe opaque anyway, so an explicit background keeps the page consistent.

**D3: Components drop their local colour properties and hard-coded hex values and reference
the tokens.**

- `--error-color` and `--border-color` disappear from both components, which closes the
  `TODO.md` polish item.
- **Accent:** the primary action in each view uses `--color-accent` and
  `--color-on-accent`:
  - Translate in the panel;
  - Save in the modal.
  Other buttons stay surface-coloured.
- **Exception:** the modal backdrop's translucent black stays hard-coded, because it works in
  both schemes.
- **Gear:** `App.svelte`'s gear already uses `currentColor`.

**D4: The R'lyehian chant is a pure helper in `src/lib/cthulu.ts`.**

- **`isChant(input)`:**
  - normalises the input: typographic apostrophes (`’ ‘ ʼ`) become `'`, it is lowercased,
    trailing `.!?…` are stripped, whitespace is trimmed and collapsed;
  - then compares the result with the canonical chant.
- **`chantView()`** returns a normal translation view with an extra flag:

  ```ts
  {
    kind: 'translation',
    text: 'In his house at R\'lyeh dead Cthulhu waits dreaming.',
    lang: 'en',
    direction: { text: "R'LYEHIAN → EN", name: "R'lyehian → English" },
    eldritch: true,
  }
  ```

  The translation member of `ResultView` gains an optional `eldritch?: boolean`.
- **Short-circuit:** `handleSubmit` checks `isChant(input)` before calling the provider. On a
  match it calls `translator.cancel()`, so an in-flight request resolves `aborted` and is
  ignored, then shows `chantView()`. It never awaits anything.

*Why a flag, not a new `kind`:* copy, clear, supersession and the flip all key on
`kind === 'translation'`. The spec requires the reply to behave as a translation, so a flag
reuses all of that with no new branches.

*Alternative:* matching inside `translate.ts`'s input guard. Rejected: the guard decides
whether a request may be sent, and the egg is presentation.

**D5: The direction flip uses `document.startViewTransition`, only when the direction
differs from the last translation since a reset.**

- **Tracking the last direction:**
  - `TranslatePanel` keeps `lastDirection: string | null`, the direction text of the last
    shown translation;
  - `reset()` sets it to `null`, which covers clear and config change; page load starts at
    `null`;
  - notices and errors leave it untouched.
- **When it animates:** a translation outcome is shown through a view transition only when
  all of these hold:
  - `lastDirection` is not null and differs from the new direction;
  - `document.startViewTransition` exists;
  - `matchMedia('(prefers-reduced-motion: reduce)')` does not match.

  Otherwise `show(next)` runs directly. Skipping the API under reduced motion also skips the
  page snapshot.
- **The DOM update:** inside the transition's update callback, the change is applied with
  `flushSync`, so the DOM has changed when the callback returns.
- **Staleness guard:** the browser runs the callback a frame later, so the panel first
  records the view on screen at call time. The callback applies `next` only if that view is
  still the current one. A clear, a settings save or a newer outcome in that frame wins,
  which keeps "no delayed, reordered or dropped outcomes" true.
- **CSS:**
  - `.direction` gets `view-transition-name: direction`;
  - global rules turn off the default root crossfade:
    `::view-transition-old(root), ::view-transition-new(root) { animation: none; }`;
  - `::view-transition-new(direction)` gets a short flip keyframe, about 300 ms
    (`rotateX(90deg)` → `0`).
  - The old snapshot is "Translating…", which has no direction label, so the group only
    enters. The flip reads as the label turning over into the new direction.
  - The rules live in `TranslatePanel.svelte` as `:global(…)`, next to the feature.

*Alternatives:*

- Keep the previous direction label visible during "Translating…" so the tags can morph.
  Rejected: it breaks "the result area shows exactly one state", and it shows a stale
  direction for a request whose direction is unknown.
- A plain CSS animation class. It is equivalent visually, but rejected: the View Transitions
  API is a stated learning goal of the project.
- Astro's `<ClientRouter>`. Rejected: it covers page navigations only, and this is a single
  page.

**D6: Eldritch styling is a class on the translation paragraph.**

- `.translation.eldritch` uses `--color-eldritch`, a glow (`text-shadow`) and a pulse
  animation with a finite iteration count, so it stops within about 4 s.
- `@media (prefers-reduced-motion: reduce)` sets `animation: none` and keeps the static
  colour and glow.
- The next result renders without the flag, so it gets the ordinary styling.

## Risks / Trade-offs

- **[Risk] Input is blocked briefly during a flip.** While a view transition runs, the
  pseudo-element overlay takes pointer input for its about 300 ms. → Mitigation: it is kept
  short and runs only on a direction change.
- **[Risk] Browser support.** `light-dark()` needs Chrome 123+, Firefox 120+ or
  Safari 17.5+. Same-document view transitions need Chrome 111+, Safari 18+ or
  Firefox 144+. → Mitigation:
  - older browsers lose only the dark scheme or the animation;
  - every token's light value must stay readable on its own;
  - the transition is feature-detected.
- **[Trade-off] Contrast is checked by hand.** CSS can't be unit-tested here. → Mitigation:
  the browser check in task 4.2 computes the ratios for each scheme.
- **[Trade-off] The chant reply is always English, even with a pair without English.** This
  is accepted: it's an easter egg, and the canonical rendering is English.

## Migration Plan

None: there is no stored state and no API. Roll back by reverting the commit.
