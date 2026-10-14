## Purpose

Gives the app its look and personality: a light or dark theme that follows the system, an
animation when the translation direction flips, and a Cthulhu-class easter egg.

## ADDED Requirements

### Requirement: Colour scheme follows the system

The page SHALL use a light or a dark colour scheme to match the system preference, and SHALL follow it if it changes while the page is open. The standalone page, embed mode and the setup modal SHALL all use the same scheme. There is no in-app toggle and no stored preference.

#### Scenario: Dark system preference

- **WHEN** the page loads with the system set to dark
- **THEN** the page background is dark and text is light
- **AND** the translation panel's controls and the setup modal use the dark scheme

#### Scenario: Light system preference

- **WHEN** the page loads with the system set to light
- **THEN** the page background is light and text is dark

#### Scenario: Preference changes while open

- **WHEN** the system preference switches from light to dark while the page is open
- **THEN** the page switches to the dark scheme without a reload

#### Scenario: Embedded page follows the system too

- **WHEN** the page runs in embed mode with the system set to dark
- **THEN** the widget uses the dark scheme

### Requirement: Text stays readable in both schemes

In both schemes, text SHALL have a contrast ratio of at least 4.5:1 against its background. This covers body text, muted text, error text, notices and control labels. Errors SHALL stay visually distinct from translations in both schemes.

#### Scenario: Error in the dark scheme

- **WHEN** an error is shown in the dark scheme
- **THEN** it uses the error styling
- **AND** its text contrast against the background is at least 4.5:1

#### Scenario: Muted text in the light scheme

- **WHEN** the translating indicator is shown in the light scheme
- **THEN** its text contrast against the background is at least 4.5:1

### Requirement: Page uses a system UI font

The page SHALL render its text in the platform's system UI font, not the browser's default serif font.

#### Scenario: Font on load

- **WHEN** the page loads
- **THEN** the panel, buttons and setup modal use the system UI sans-serif font

### Requirement: A direction change is animated

When a translation is shown whose direction differs from the previous translation shown since the last reset, the direction label SHALL animate to mark the flip. A reset is a page load, clearing the input or saving settings. Notices and errors shown in between do not count as translations and do not reset the comparison.

#### Scenario: Flip from Polish to English input

- **WHEN** `kawa` is translated (`PL → EN`) and then `coffee` is translated (`EN → PL`)
- **THEN** the direction label animates as `EN → PL` appears

#### Scenario: Flip across an error

- **WHEN** a `PL → EN` translation is shown, a later submit ends in an error, and the next submit is translated `EN → PL`
- **THEN** the direction label animates as `EN → PL` appears

### Requirement: Unchanged direction is not animated

A translation SHALL be shown without the flip animation when it has the same direction as the previous translation, or when it is the first translation since the last reset.

#### Scenario: Same direction twice

- **WHEN** `kawa` and then `herbata` are translated, both `PL → EN`
- **THEN** the second translation appears without the flip animation

#### Scenario: First translation after loading

- **WHEN** the first translation after the page loads is shown
- **THEN** it appears without the flip animation

#### Scenario: First translation after clearing

- **WHEN** a `PL → EN` translation is shown, the user clears the input, and the next submit is translated `EN → PL`
- **THEN** it appears without the flip animation

### Requirement: Animation degrades to an instant update

When the user prefers reduced motion, or the browser lacks support for the animation, the new result SHALL appear at once with the same content and no animation. The animation SHALL NOT delay, reorder or drop any outcome.

#### Scenario: Reduced motion

- **WHEN** the user prefers reduced motion and the direction flips
- **THEN** the new translation appears at once, without animation

#### Scenario: Browser without support

- **WHEN** the browser has no View Transitions support and the direction flips
- **THEN** the new translation appears at once, without animation

### Requirement: The R'lyehian chant is answered locally

Submitting the chant "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn" SHALL show the translation "In his house at R'lyeh dead Cthulhu waits dreaming." with the direction `R'LYEHIAN → EN`, accessible as "R'lyehian → English". No request SHALL be sent. It SHALL work with any configured pair and behave as a translation for copy, clear and supersession.

#### Scenario: Chant submitted

- **WHEN** the user submits the chant with the pair `pl` / `en`
- **THEN** the result shows "In his house at R'lyeh dead Cthulhu waits dreaming."
- **AND** the direction reads `R'LYEHIAN → EN`
- **AND** no request is sent to the provider

#### Scenario: Chant with an unrelated pair

- **WHEN** the user submits the chant with the pair `de` / `fr`
- **THEN** the same English reply is shown with the direction `R'LYEHIAN → EN`

#### Scenario: Chant supersedes an in-flight request

- **WHEN** a translation of `kawa` is in flight and the user submits the chant
- **THEN** the `kawa` request is cancelled and its outcome is never shown
- **AND** the chant's reply is shown

#### Scenario: Chant reply can be copied

- **WHEN** the chant's reply is shown and the user activates copy
- **THEN** "In his house at R'lyeh dead Cthulhu waits dreaming." is copied

### Requirement: The chant is matched loosely

The chant SHALL be recognised regardless of letter case, extra or missing whitespace between words, straight or typographic apostrophes, and trailing punctuation. Any other input, including part of the chant, SHALL be translated as usual.

#### Scenario: Sloppy but complete chant

- **WHEN** the user submits `  PH’NGLUI  mglw'nafh cthulhu r'lyeh wgah’nagl FHTAGN!!` (padded spaces, curly apostrophes, mixed case, trailing `!!`)
- **THEN** the chant's reply is shown and no request is sent

#### Scenario: Partial chant

- **WHEN** the user submits `fhtagn`
- **THEN** a translation of `fhtagn` is requested from the provider

### Requirement: The chant's reply has an eldritch style

The chant's reply SHALL be styled visibly differently from ordinary translations. Any motion SHALL stop on its own within a few seconds, and SHALL be replaced by static styling when the user prefers reduced motion. The next result SHALL use the ordinary styling.

#### Scenario: Reply styling

- **WHEN** the chant's reply is shown
- **THEN** it uses the eldritch styling, not the ordinary translation styling

#### Scenario: Reduced motion

- **WHEN** the user prefers reduced motion and the chant's reply is shown
- **THEN** it uses the eldritch styling without motion

#### Scenario: Back to normal

- **WHEN** the chant's reply is shown and the user then gets an ordinary translation
- **THEN** that translation uses the ordinary styling
