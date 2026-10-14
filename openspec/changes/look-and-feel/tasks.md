## 1. Theme

- [ ] 1.1 Create `src/styles/theme.css` (D1, D2):
  - `:root`: `color-scheme: light dark`, the `light-dark()` colour tokens and `--font-ui`;
  - `body`: background, text colour and font from the tokens.

  Import it in the frontmatter of `src/pages/index.astro`. Verify that `npx astro build` succeeds and that the built `dist/index.html` `<head>` loads the theme CSS.
- [ ] 1.2 Replace the hard-coded colours with tokens (D3):
  - in `TranslatePanel.svelte` and `SetupModal.svelte`, drop the local `--error-color` and `--border-color`;
  - give the Translate and Save buttons the accent colours;
  - keep the modal backdrop's translucent black.

  Verify that `grep -nE '#[0-9a-fA-F]{3,6}\b' src/components/*.svelte` matches nothing, and that `npx svelte-check --fail-on-warnings` passes.
- [ ] 1.3 Update the docs:
  - `AGENTS.md` Structure: add the `src/styles/theme.css` line and note that components use its tokens;
  - `TODO.md`: drop the `--error-color` / `--border-color` polish item.

  Verify that every file listed in `AGENTS.md` exists.

## 2. R'lyehian easter egg

- [ ] 2.1 Add `src/lib/cthulu.ts` with `isChant` and `chantView`, and add the optional `eldritch` flag to the translation member of `ResultView` (D4). Add `src/lib/cthulu.test.ts` covering:
  - the exact chant;
  - the sloppy variant from the spec (padding, curly apostrophes, mixed case, trailing `!!`);
  - rejection of a partial chant (`fhtagn`) and of the chant with an extra word;
  - `chantView`'s text, `lang` and direction.

  Verify that `npx vitest run` passes.
- [ ] 2.2 In `TranslatePanel.svelte`, short-circuit `handleSubmit` on `isChant(input)`: call `translator.cancel()`, then show `chantView()` without a request (D4). Add the `eldritch` class and its styling: `--color-eldritch`, a glow, and a finite pulse that is static under `prefers-reduced-motion` (D6). Verify that `npx svelte-check --fail-on-warnings` passes.
- [ ] 2.3 Add `src/lib/cthulu.ts` and its test to `AGENTS.md` Structure, and mention the chant on the `TranslatePanel.svelte` line. Verify that every file listed in `AGENTS.md` exists.

## 3. Direction flip

- [ ] 3.1 In `TranslatePanel.svelte` (D5):
  - track `lastDirection`, set by shown translations and cleared by `reset()`;
  - when the direction differs, and the API exists and reduced motion is off, show the outcome through `document.startViewTransition`, using `flushSync` and the staleness guard;
  - add the global view-transition CSS: no root crossfade, a flip keyframe on `::view-transition-new(direction)`, and `view-transition-name: direction` on `.direction`.

  Verify that `npx svelte-check --fail-on-warnings` passes.
- [ ] 3.2 Mention the direction flip on the `TranslatePanel.svelte` line in `AGENTS.md` Structure.

## 4. Integration checks

- [ ] 4.1 Run `npx vitest run && npx tsc --noEmit && npx svelte-check --fail-on-warnings && npx astro check`; verify all pass with 0 warnings
- [ ] 4.2 Browser check in `astro dev` through the T3 preview:
  - **Schemes:** run each check in light and dark (preview appearance):
    - the background, panel controls and setup modal follow the scheme;
    - switching the appearance while open follows without a reload;
    - the computed `font-family` is the system UI font.
  - **Contrast:** compute the contrast ratio of the text against its background for body text, muted text (the translating indicator), the error, the modal notice and status, ordinary buttons and the accent button. Every ratio must be at least 4.5:1, in both schemes.
  - **Embed:** with `?embed=1` and inside an iframe harness, the widget uses the dark scheme when the appearance is dark.
  - **Flip:** with a real provider, and with `document.startViewTransition` wrapped to count its calls:
    - `kawa`, then `coffee`: one transition, and the label reads `EN → PL`;
    - `kawa`, then `herbata`: no transition;
    - the first translation after load: no transition;
    - `PL → EN`, clear, then `coffee`: no transition;
    - `PL → EN`, an error, then `coffee`: one transition;
    - with `matchMedia('(prefers-reduced-motion: reduce)')` stubbed to match, a flip calls no transition and the result still shows.
  - **Chant:**
    - the sloppy chant shows the reply, `R'LYEHIAN → EN` and the eldritch styling, and no `fetch` is made;
    - the pulse animation ends on its own;
    - copy yields the reply text;
    - `fhtagn` goes to the provider;
    - the next ordinary translation has no eldritch styling;
    - the chant submitted during an in-flight request cancels that request.

## Workflow follow-up

- Propose a commit after planning, after apply, and after archive (three commits).
- At archive:
  - tick `presentation` in the `context.md` roadmap (implemented as the `look-and-feel` change);
  - set the next `TODO.md` item to `plan postmessage-api`.
