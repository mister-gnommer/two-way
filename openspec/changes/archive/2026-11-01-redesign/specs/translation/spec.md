# Spec Delta

## ADDED Requirements

### Requirement: Panel controls share one input bar

The panel SHALL group its controls in one input bar, in this order: the pair indicator, the input, the clear action while the input is not empty, a Settings icon button, and the Translate button. The Translate button SHALL show the two-way logo and have the accessible name "Translate". The Settings button SHALL have the accessible name "Settings". The full and compact layouts SHALL use the same bar.

#### Scenario: Bar contents with text

- **WHEN** a configured panel's input holds `kawa`
- **THEN** the bar shows, in order, the pair indicator, the input, the clear action, the Settings button and the Translate button

#### Scenario: Bar contents when empty

- **WHEN** a configured panel's input is empty
- **THEN** the bar shows the pair indicator, the input, the Settings button and the Translate button, with no clear action

#### Scenario: Logo button translates

- **WHEN** the user activates the button showing the logo
- **THEN** a translation of the current input is requested, as with any Translate button activation
- **AND** assistive technology names that button "Translate"

#### Scenario: Same bar in both layouts

- **WHEN** a configured page is shown top-level, and again with `?embed=1`
- **THEN** both show the same input bar with the same controls

### Requirement: Settings opens from the input bar

Once a configuration exists, the Settings icon button in the input bar SHALL be the settings control, in both layouts. It SHALL open the setup modal prefilled with the saved configuration and dismissible. No other settings control SHALL be shown.

#### Scenario: Settings button opens the modal

- **WHEN** a configured page is shown and the user activates the Settings button in the input bar
- **THEN** the setup modal opens, prefilled with the saved configuration and dismissible

#### Scenario: No separate settings control

- **WHEN** a configured page is shown, top-level or embedded
- **THEN** no Settings text button and no corner gear are shown outside the input bar

### Requirement: Input is labelled by its placeholder

In both layouts, the input's label SHALL be visually hidden, the same text SHALL appear as the input's placeholder, and the label SHALL remain the input's accessible name.

#### Scenario: Placeholder instead of a visible label

- **WHEN** a configured page is shown, top-level or embedded
- **THEN** no label text is visible next to the input
- **AND** the empty input shows "Text to translate" as its placeholder
- **AND** the input's accessible name is "Text to translate"

### Requirement: Input grows with its content

The input SHALL start one row tall and grow by one row per line of content up to six rows. Past six rows, it SHALL keep that height and scroll. It SHALL return to fewer rows when lines are removed. Its height SHALL follow width changes that rewrap the content, and it SHALL never be shorter than one row. The input SHALL NOT offer a manual resize handle.

#### Scenario: Single line

- **WHEN** the input is empty or holds one short line
- **THEN** the input is one row tall

#### Scenario: Shift+Enter adds a row

- **WHEN** the input holds one line and the user presses Shift+Enter
- **THEN** the input becomes two rows tall and no translation is requested

#### Scenario: Long input scrolls

- **WHEN** the input holds ten lines
- **THEN** the input is six rows tall and its content scrolls

#### Scenario: Clearing shrinks the input

- **WHEN** the input holds three lines and the user activates clear
- **THEN** the input is empty and one row tall

#### Scenario: Width change rewraps the input

- **WHEN** the input holds a long line that wraps to two rows and the panel widens until it fits on one
- **THEN** the input becomes one row tall without further typing

#### Scenario: Loaded before layout

- **WHEN** the panel mounts in a frame that has no layout yet, then becomes visible
- **THEN** the input is at least one row tall and can be clicked
