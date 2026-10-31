# Spec Delta

## MODIFIED Requirements

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
- **THEN** the full layout is shown, with the logo-and-title header

### Requirement: Embed mode applies before first paint

In embed mode, the full-layout chrome (the logo-and-title header and the default page margin) SHALL NOT be painted at any point, including while the config is loading.

#### Scenario: No flash of the full layout

- **WHEN** the page loads in embed mode
- **THEN** the header is never visible, not even before the app has loaded its config

### Requirement: Compact layout uses the frame's width

In embed mode, the page SHALL hide the logo-and-title header, drop the default page margin in favour of a small inset, and let the translation panel fill the available width instead of the full layout's centred column cap.

#### Scenario: Panel fills a wide frame

- **WHEN** the page is embedded in a frame 900 px wide
- **THEN** the panel's input bar spans the frame's width, minus the small inset

#### Scenario: Panel fits a narrow frame

- **WHEN** the page is embedded in a frame 250 px wide
- **THEN** the panel shows without horizontal scrolling

## REMOVED Requirements

### Requirement: Compact input keeps its accessible name

**Reason**: Both layouts now share one input bar. The placeholder-as-label behaviour applies everywhere, and the two-row resizable input is replaced by an auto-growing one.
**Migration**: See `translation` → "Input is labelled by its placeholder" and "Input grows with its content".

### Requirement: Settings is a compact icon control in embed mode

**Reason**: The Settings icon button now sits in the shared input bar in both layouts, replacing both the embed corner gear and the standalone Settings text button.
**Migration**: See `translation` → "Settings opens from the input bar".
