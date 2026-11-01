# Spec Delta

## ADDED Requirements

### Requirement: The accent colour is teal

The page SHALL use teal as its accent colour in both schemes: for the pair indicator, focus indicators and accent-coloured text. Accent-coloured text SHALL meet the readability contrast rule.

#### Scenario: Pair indicator in the light scheme

- **WHEN** the panel is shown in the light scheme
- **THEN** the pair indicator uses the teal accent
- **AND** its text contrast against its background is at least 4.5:1

#### Scenario: Pair indicator in the dark scheme

- **WHEN** the panel is shown in the dark scheme
- **THEN** the pair indicator uses the teal accent
- **AND** its text contrast against its background is at least 4.5:1

### Requirement: The logo stays visible in both schemes

Wherever the two-way logo is shown, it SHALL sit on a dark tile, so its light arrow stays visible in both schemes.

#### Scenario: Logo in the light scheme

- **WHEN** the Translate button is shown in the light scheme
- **THEN** the logo sits on a dark tile and both of its arrows are visible

### Requirement: Logo controls show keyboard focus

The Translate button and the Settings button SHALL show a visible teal focus indicator when focused from the keyboard.

#### Scenario: Tabbing to the Translate button

- **WHEN** the user moves keyboard focus to the Translate button
- **THEN** a teal focus ring is visible around it

### Requirement: Standalone page has a logo header

The full layout SHALL show a header with the two-way logo next to the title "two-way", above a centred panel column.

#### Scenario: Header on the standalone page

- **WHEN** a configured page is opened top-level
- **THEN** a header shows the logo and "two-way" above the panel
- **AND** the panel is centred horizontally

### Requirement: The favicon is the logo

The page's favicon SHALL show the two-way logo.

#### Scenario: Browser tab icon

- **WHEN** the page is open in a browser tab
- **THEN** the tab icon is the two-way logo

