# embedding Specification

## Purpose

Lets the page run as a compact widget inside a host page's iframe (start.me's Embed widget):
when the page counts as embedded, how its layout and settings control adapt, and how it stays
usable and frameable.

## Requirements

### Requirement: Embed mode is on when requested or framed

The system SHALL treat the page as embedded when its URL query has `embed=1`, or when the page runs inside a frame of any origin. Otherwise the page SHALL show the full layout.

#### Scenario: Query parameter turns embed mode on

- **WHEN** the page is opened top-level with `?embed=1`
- **THEN** the compact layout is shown

#### Scenario: Framed page is embedded without the parameter

- **WHEN** the page is loaded inside a cross-origin iframe without any query parameter
- **THEN** the compact layout is shown

#### Scenario: Top-level page keeps the full layout

- **WHEN** the page is opened top-level without `embed=1`, including with `?embed=0`
- **THEN** the full layout is shown, with the title and the Settings text button

### Requirement: Embed mode applies before first paint

In embed mode, the full-layout chrome (the title and the default page margin) SHALL NOT be painted at any point, including while the config is loading.

#### Scenario: No flash of the full layout

- **WHEN** the page loads in embed mode
- **THEN** the title is never visible, not even before the app has loaded its config

### Requirement: Compact layout uses the frame's width

In embed mode, the page SHALL hide the title, drop the default page margin in favour of a small inset, and let the translation panel fill the available width instead of the full layout's 300 px cap.

#### Scenario: Panel fills a wide frame

- **WHEN** the page is embedded in a frame 500 px wide
- **THEN** the panel's input spans the frame's width, minus the small inset

#### Scenario: Panel fits a narrow frame

- **WHEN** the page is embedded in a frame 250 px wide
- **THEN** the panel shows without horizontal scrolling

### Requirement: Compact input keeps its accessible name

In embed mode, the input's visible label SHALL be hidden, the same text SHALL appear as the input's placeholder, and the label SHALL remain the input's accessible name. The input SHALL start two rows tall and remain resizable.

#### Scenario: Label becomes a placeholder

- **WHEN** a configured page is shown in embed mode
- **THEN** no label text is visible above the input
- **AND** the empty input shows "Text to translate" as its placeholder
- **AND** the input's accessible name is "Text to translate"

#### Scenario: Input starts shorter

- **WHEN** a configured page is shown in embed mode
- **THEN** the input is two rows tall

### Requirement: Settings is a compact icon control in embed mode

Once a configuration exists, embed mode SHALL show the settings control as a small icon button in the top-right corner instead of the Settings text button. Its accessible name SHALL be "Settings", and it SHALL open the same setup modal as the text button.

#### Scenario: Gear replaces the text button

- **WHEN** a configured page is shown in embed mode
- **THEN** an icon button named "Settings" is shown in the top-right corner
- **AND** no Settings text button is shown

#### Scenario: Gear opens the settings

- **WHEN** the user activates the icon button
- **THEN** the setup modal opens, prefilled with the saved configuration and dismissible

### Requirement: Setup works inside a frame

In embed mode, the first-run setup SHALL work as it does top-level: with no saved configuration in the frame's storage, the blocking setup modal SHALL open inside the frame and fit within it, scrolling if the frame is shorter than the form.

#### Scenario: Unconfigured frame shows setup

- **WHEN** the page is embedded and no configuration is saved in the frame's storage
- **THEN** the blocking setup modal opens inside the frame

#### Scenario: Setup fits a small frame

- **WHEN** the setup modal opens in a frame 300 px wide and 250 px tall
- **THEN** the modal fits the frame's width
- **AND** every field and button can be reached by scrolling inside the modal

### Requirement: The site never forbids framing

The site SHALL NOT send `X-Frame-Options` or a Content-Security-Policy `frame-ancestors` directive, and SHALL NOT include page code that refuses to run or breaks out when framed.

#### Scenario: Framed by another origin

- **WHEN** a page on another origin embeds the site in an iframe
- **THEN** the site loads and works inside the iframe
