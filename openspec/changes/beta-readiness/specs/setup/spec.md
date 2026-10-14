# Spec Delta

## MODIFIED Requirements

### Requirement: The first-run form is prefilled

When no configuration is saved, the form SHALL prefill the base URL with `https://api.openai.com/v1` and the model with `gpt-4.1-mini`, leaving the API key and both languages empty. When a configuration is saved, the form SHALL show the saved values instead.

#### Scenario: First run shows the defaults

- **WHEN** the modal opens with no saved configuration
- **THEN** the base URL field contains `https://api.openai.com/v1` and the model field contains `gpt-4.1-mini`
- **AND** the API key and both languages are empty

#### Scenario: Settings show the saved values

- **WHEN** the modal opens from the settings
- **THEN** every field shows the saved value, not the defaults

#### Scenario: An existing model is not replaced

- **WHEN** a user with a saved model of `gpt-4o-mini` loads the updated app and opens Settings
- **THEN** the model field still contains `gpt-4o-mini`
- **AND** saving without editing the model keeps that value
