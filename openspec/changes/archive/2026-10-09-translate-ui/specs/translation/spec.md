## ADDED Requirements

### Requirement: Translation panel is shown once configured

The system SHALL show the translation panel only after a config has loaded. The panel has a text input, a Translate button and a result area. While config is loading, or when no config exists, no panel SHALL be shown. The panel SHALL show the configured pair as uppercased primary subtags joined by `↔` (e.g. `PL ↔ EN`), with the full language names as its accessible label.

#### Scenario: Configured app shows the panel

- **WHEN** a saved config with the pair `pl` / `en` has loaded
- **THEN** the translation panel is shown
- **AND** it displays the pair as `PL ↔ EN`

#### Scenario: No panel before configuration

- **WHEN** config is still loading, or no config exists
- **THEN** no translation panel is shown

### Requirement: Translation is requested on explicit submit

The system SHALL request a translation only when the user submits, either by pressing Enter in the input or by activating the Translate button. Shift+Enter SHALL insert a newline instead of submitting. Enter pressed during IME composition SHALL NOT submit. Typing alone SHALL NOT send a request.

#### Scenario: Enter submits

- **WHEN** the user types `kawa` and presses Enter
- **THEN** a translation of `kawa` is requested

#### Scenario: Shift+Enter inserts a newline

- **WHEN** the user presses Shift+Enter in the input
- **THEN** a newline is inserted
- **AND** no translation is requested

#### Scenario: Translate button submits

- **WHEN** the user activates the Translate button
- **THEN** a translation of the current input is requested

#### Scenario: Typing does not translate

- **WHEN** the user types without submitting
- **THEN** no translation is requested

#### Scenario: IME composition is not interrupted

- **WHEN** the user presses Enter to confirm an IME composition
- **THEN** no translation is requested

### Requirement: Outcomes are shown inline in one result area

The result area SHALL show exactly one state at a time:
- nothing, before the first submit;
- a translating indicator, while a request is in flight;
- the translation;
- the off-pair message;
- the input guard's message;
- the error message.

Errors SHALL be visually distinct from translations. The result area SHALL be announced to assistive technology when its content changes. No message SHALL be shown in a separate overlay or toast.

#### Scenario: In-flight request shows an indicator

- **WHEN** a translation has been requested and has not resolved
- **THEN** the result area shows that translation is in progress

#### Scenario: Translation is shown

- **WHEN** the translation outcome arrives
- **THEN** the result area shows the translated text

#### Scenario: Off-pair input shows its message

- **WHEN** the outcome is an off-pair rejection
- **THEN** the result area shows the rejection message
- **AND** no translation is shown

#### Scenario: Guard rejection shows its message

- **WHEN** the user submits blank or over-length input
- **THEN** the result area shows the guard's message
- **AND** no request is sent

#### Scenario: Provider error is shown as an error

- **WHEN** the outcome is an error
- **THEN** the result area shows the error message, styled as an error

#### Scenario: Outcome is announced

- **WHEN** the result area's content changes
- **THEN** assistive technology announces the new content

### Requirement: Input is never discarded by an outcome

No translation outcome SHALL clear or alter the input text. After any outcome, including an error, the input SHALL still hold what the user submitted, so it can be resent or edited.

#### Scenario: Error keeps the input

- **WHEN** a submit ends in an error
- **THEN** the input still holds the submitted text

#### Scenario: Success keeps the input

- **WHEN** a submit ends in a translation
- **THEN** the input still holds the submitted text

### Requirement: Detected direction is displayed

A shown translation SHALL display its direction as the source and target pair members' uppercased primary subtags joined by `→`. The full language names SHALL be its accessible label and tooltip. Only the configured pair members are displayed, never the model's raw detected tag.

#### Scenario: Direction of a Polish input

- **WHEN** `kawa` is translated with the pair `pl` / `en`
- **THEN** the result shows the direction `PL → EN`
- **AND** its accessible label reads `Polish → English`

#### Scenario: Regional pair member shows its primary subtag

- **WHEN** a translation's source is the pair member `pl-PL`
- **THEN** the direction shows `PL` for the source
- **AND** the accessible label names it `Polish (Poland)`

### Requirement: A newer submit supersedes the shown result

When the user submits while a request is in flight, only the newer request's outcome SHALL be shown. A superseded request SHALL NOT change the result area.

#### Scenario: Earlier answer arrives late

- **WHEN** the user submits `kawa`, then submits `herbata` before `kawa` resolves
- **THEN** only the outcome for `herbata` is shown

### Requirement: Translation can be copied

A shown translation SHALL offer a copy action that places the translated text on the clipboard and briefly confirms it. Copying SHALL also work in a cross-origin iframe that grants no clipboard permission, as far as the browser allows. When no copy method succeeds, the system SHALL select the translated text and tell the user to copy it manually.

#### Scenario: Copy succeeds

- **WHEN** the user activates copy on a shown translation
- **THEN** the translated text is on the clipboard
- **AND** a brief confirmation is shown

#### Scenario: Copy in an iframe without clipboard permission

- **WHEN** the page runs in a cross-origin iframe without clipboard permission and the user activates copy
- **THEN** the translated text is still copied, or it is selected with a message asking the user to copy it manually

#### Scenario: Copy is offered only for translations

- **WHEN** the result area shows anything other than a translation
- **THEN** no copy action is offered

### Requirement: Input can be cleared in one action

When the input is not empty, the panel SHALL offer a clear action. Clearing SHALL empty the input, reset the result area, cancel any in-flight request and focus the input.

#### Scenario: Clearing input and result

- **WHEN** the input holds text, a translation is shown, and the user activates clear
- **THEN** the input is empty and focused
- **AND** the result area is empty

#### Scenario: Clearing during a request

- **WHEN** the user activates clear while a request is in flight
- **THEN** the request is cancelled
- **AND** its outcome is never shown

#### Scenario: Empty input has no clear action

- **WHEN** the input is empty
- **THEN** no clear action is offered

### Requirement: Saving settings resets the result

When new settings are saved, the system SHALL cancel any in-flight translation and reset the result area, because the pair or provider may have changed. The input text SHALL be kept, and the pair indicator SHALL show the new pair.

#### Scenario: Pair changed in settings

- **WHEN** a translation is shown and the user saves settings with a new pair
- **THEN** the result area is empty
- **AND** the input still holds its text
- **AND** the pair indicator shows the new pair

#### Scenario: Save during a request

- **WHEN** the user saves settings while a translation is in flight
- **THEN** that request is cancelled and its outcome is never shown

#### Scenario: Cancelled settings keep the result

- **WHEN** the user opens settings and cancels
- **THEN** the shown result is unchanged
