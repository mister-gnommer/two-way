# setup Specification

## Purpose

Lets the user configure the provider (base URL, model, API key) and the language pair through a setup modal, validates the configuration before it is saved, and blocks the app until a usable configuration exists.

## ADDED Requirements

### Requirement: Setup blocks the app until configured

When the initial config load settles with no saved configuration, the system SHALL show the setup modal and SHALL NOT let the user dismiss it until a valid configuration is saved. The modal SHALL NOT be shown while the config load is still pending.

#### Scenario: No config opens the blocking modal

- **WHEN** the config load resolves with no saved configuration
- **THEN** the setup modal is shown
- **AND** it offers no cancel or close control

#### Scenario: The blocking modal cannot be dismissed

- **WHEN** the modal is blocking and the user presses Escape (once or repeatedly)
- **THEN** the modal stays open

#### Scenario: Loading never shows the modal

- **WHEN** the config load is still pending
- **THEN** a loading state is shown
- **AND** the setup modal is not shown

#### Scenario: Saved config skips the modal

- **WHEN** the config load resolves with a saved configuration
- **THEN** the setup modal is not shown

### Requirement: Settings can be reopened and cancelled

When a configuration exists, the system SHALL offer a settings control that opens the setup modal prefilled with the saved configuration. In this mode the modal SHALL be dismissible (cancel control or Escape) without changing the saved configuration.

#### Scenario: Reopened modal is prefilled

- **WHEN** a configuration exists and the user opens the settings
- **THEN** the modal shows the saved base URL, model, API key, and both languages

#### Scenario: Cancelling keeps the saved configuration

- **WHEN** the user edits fields in the reopened modal and then cancels or presses Escape
- **THEN** the modal closes
- **AND** the saved configuration is unchanged

#### Scenario: Reopening after cancel shows the saved values

- **WHEN** the user cancels with unsaved edits and opens the settings again
- **THEN** the modal shows the saved configuration, not the discarded edits

### Requirement: The form collects provider and pair settings

The setup form SHALL collect the provider base URL, the model name, the API key, and two languages. The API key field SHALL be masked by default, with a control that reveals it.

#### Scenario: API key is masked by default

- **WHEN** the modal opens
- **THEN** the API key field hides its value
- **AND** a control lets the user reveal it

### Requirement: Text fields are trimmed and required

The system SHALL trim the base URL, model, and API key before validating and saving them, and SHALL reject any of them that is empty after trimming.

#### Scenario: Surrounding whitespace is removed

- **WHEN** the user enters ` sk-abc ` as the key and saves an otherwise valid form
- **THEN** the saved key is `sk-abc`

#### Scenario: Empty field is rejected

- **WHEN** the model field is empty or whitespace only
- **THEN** the form shows an error for the model field
- **AND** nothing is saved

### Requirement: Base URL must be a secure absolute URL

The base URL SHALL be an absolute URL using `https:`, except that `http:` SHALL be accepted for the loopback hosts `localhost`, `127.0.0.1`, and `[::1]`. A base URL containing credentials, a query, or a fragment SHALL be rejected.

#### Scenario: HTTPS URL is accepted

- **WHEN** the base URL is `https://api.openai.com/v1`
- **THEN** the base URL passes validation

#### Scenario: Plain HTTP to a remote host is rejected

- **WHEN** the base URL is `http://api.example.com/v1`
- **THEN** the form shows a base URL error stating that HTTPS is required
- **AND** nothing is saved

#### Scenario: Plain HTTP to loopback is accepted

- **WHEN** the base URL is `http://localhost:11434/v1` or `http://127.0.0.1:1234/v1`
- **THEN** the base URL passes validation

#### Scenario: Malformed or decorated URL is rejected

- **WHEN** the base URL is not an absolute URL, or contains credentials, a query, or a fragment
- **THEN** the form shows a base URL error

### Requirement: API key is limited to visible ASCII

The system SHALL reject an API key containing any character outside visible ASCII (U+0021–U+007E), such as inner spaces, line breaks, or typographic quotes. The error message SHALL NOT echo the key.

#### Scenario: Pasted smart quote is rejected

- **WHEN** the key contains `“` or an inner space
- **THEN** the form shows an API key error
- **AND** the message does not contain the key

### Requirement: Languages are chosen from a curated list

Each pair language SHALL be chosen from a fixed list of common languages, identified by primary-language BCP-47 tags and labelled with human-readable names. The two selected languages SHALL differ. When a saved pair contains a tag that is not in the list, that tag SHALL remain selectable, so reopening and saving keeps the pair unchanged.

#### Scenario: Same language twice is rejected

- **WHEN** both language fields are set to the same language
- **THEN** the form shows a pair error
- **AND** nothing is saved

#### Scenario: Missing language is rejected

- **WHEN** a language field has no selection
- **THEN** the form shows an error for that field

#### Scenario: Listed languages differ in primary subtag

- **WHEN** any two different languages of the list are selected
- **THEN** their tags differ in primary language subtag

#### Scenario: Unlisted saved tag is preserved

- **WHEN** the saved pair is `pl-PL` / `en` and `pl-PL` is not in the list
- **THEN** the reopened modal shows `pl-PL` as the selected first language
- **AND** saving without changing it keeps `pl-PL`

### Requirement: Validation errors are shown per field

When the user saves or tests an invalid form, the system SHALL show each error next to the field it concerns and SHALL NOT save or send anything.

#### Scenario: Several errors at once

- **WHEN** the base URL is plain HTTP to a remote host and the model is empty
- **THEN** both fields show their own error
- **AND** no configuration is saved and no request is sent

### Requirement: Valid configuration is saved without a test

Saving a form that passes validation SHALL persist the configuration through the config storage and close the modal. Saving SHALL NOT require a prior test call.

#### Scenario: Valid form is saved and the modal closes

- **WHEN** the user saves a valid form without testing it
- **THEN** the configuration is persisted
- **AND** the modal closes and the app shows the configured state

#### Scenario: Saved configuration survives a reload

- **WHEN** a configuration was saved and storage is persistent, and the page is reloaded
- **THEN** the setup modal is not shown

### Requirement: Test call checks the configuration on demand

The modal SHALL offer a test control that validates the form and then sends one translation request with the current form values. Any answer the provider gives as a translation or an off-pair result SHALL count as success. Any other result SHALL show the provider client's error message. The test SHALL NOT save the configuration.

#### Scenario: Working configuration reports success

- **WHEN** the user tests a valid form and the provider answers with a translation or an off-pair result
- **THEN** the modal reports that the connection works
- **AND** the configuration is not saved

#### Scenario: Failing configuration reports the provider error

- **WHEN** the user tests a valid form and the provider call results in an error (e.g. key rejected)
- **THEN** the modal shows that error's message
- **AND** the form keeps all entered values

#### Scenario: Test is in progress

- **WHEN** a test request is in flight
- **THEN** the test control indicates progress and cannot start a second test

#### Scenario: Editing clears a stale test result

- **WHEN** a test result is shown and the user changes any field
- **THEN** the test result is cleared

#### Scenario: Leaving the modal cancels the test

- **WHEN** the modal is saved or cancelled while a test is in flight
- **THEN** the test request is cancelled and its result is never shown

### Requirement: Session-only storage is disclosed

When the config storage has fallen back to session-only memory, the setup modal SHALL show an informational notice that the settings last only until the page is closed. The notice SHALL NOT be presented as an error and SHALL NOT prevent saving.

#### Scenario: Fallback shows the notice

- **WHEN** the storage's in-memory fallback signal is true and the modal is open
- **THEN** the modal shows the session-only notice
- **AND** saving still works

#### Scenario: Persistent storage shows no notice

- **WHEN** the in-memory fallback signal is false
- **THEN** no session-only notice is shown
