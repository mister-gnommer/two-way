## ADDED Requirements

### Requirement: Translation request is sent directly from the browser

The system SHALL send each translation request from the browser straight to the configured OpenAI-compatible provider. It SHALL use a single Chat Completions call to `{baseUrl}/chat/completions` with the configured model and the prompt's system and user parts as two messages. Trailing slashes on the base URL SHALL be ignored. No server of ours SHALL be involved.

#### Scenario: Request targets the configured endpoint

- **WHEN** a translation is requested with base URL `https://api.example.com/v1/`
- **THEN** a single POST is sent to `https://api.example.com/v1/chat/completions`
- **AND** its body names the configured model

#### Scenario: Prompt parts become system and user messages

- **WHEN** a translation is requested
- **THEN** the request carries the prompt's system part as a system message
- **AND** the trimmed input as the user message

### Requirement: Input is guarded before any request

The system SHALL run the input guard before any network call. Blank or over-length input SHALL produce the guard's rejection outcome without contacting the provider.

#### Scenario: Blank input never reaches the provider

- **WHEN** a translation is requested for whitespace-only input
- **THEN** the result is the blank rejection
- **AND** no request is sent

#### Scenario: Over-length input never reaches the provider

- **WHEN** a translation is requested for input over the length limit
- **THEN** the result is the too-long rejection
- **AND** no request is sent

### Requirement: Structured output is always requested

Every request SHALL ask for strict JSON-schema structured output using the translation response contract. The system SHALL NOT fall back to unstructured or plain JSON-object output. When the provider rejects the structured-output parameter, the result SHALL be an error stating that the model does not support structured output.

#### Scenario: Request carries the response schema

- **WHEN** a translation is requested
- **THEN** the request asks for strict JSON-schema output
- **AND** the schema is the translation response contract

#### Scenario: Provider rejects structured output

- **WHEN** the provider answers 400 with an error that names the structured-output parameter
- **THEN** the result is an error saying the model does not support structured output
- **AND** no second request is sent

### Requirement: Low temperature with a single retry when unsupported

The system SHALL request a temperature of 0.2. When the provider answers 400 with an error that names the temperature parameter, the system SHALL retry the same request once without temperature. After such a rejection, later requests from the same translator to the same base URL and model SHALL omit temperature.

#### Scenario: Temperature is sent by default

- **WHEN** a translation is requested for a model with no recorded temperature rejection
- **THEN** the request carries temperature 0.2

#### Scenario: Rejected temperature triggers one retry

- **WHEN** the provider answers 400 with an error naming temperature
- **THEN** the same request is sent once more without temperature
- **AND** the result is the outcome of that retry

#### Scenario: Rejection is remembered for the model

- **WHEN** a model has rejected temperature and a later translation targets the same base URL and model
- **THEN** the first request for that translation omits temperature

#### Scenario: Retry happens at most once

- **WHEN** the retry without temperature also fails
- **THEN** no further request is sent
- **AND** the result is the error for the retry's failure

### Requirement: Newer translation supersedes an in-flight one

A translator SHALL have at most one translation in flight. Starting a new translation SHALL abort the previous one. An explicit cancel SHALL also abort it. A superseded or cancelled translation SHALL resolve as aborted, never with its response or an error, so a stale response never replaces a newer result.

#### Scenario: Second request aborts the first

- **WHEN** a translation is started while another is in flight
- **THEN** the earlier request is aborted
- **AND** the earlier call resolves as aborted

#### Scenario: Late response of a superseded request is dropped

- **WHEN** a superseded request's response arrives after a newer translation started
- **THEN** that response is not parsed into a result
- **AND** the superseded call resolves as aborted

#### Scenario: Explicit cancel

- **WHEN** the in-flight translation is cancelled
- **THEN** its request is aborted and it resolves as aborted

### Requirement: Requests time out

Each translation SHALL be abandoned 30 seconds after it starts, including any temperature retry. A timed-out translation SHALL resolve as an error stating that the provider took too long, distinct from aborted.

#### Scenario: Slow provider times out

- **WHEN** the provider has not answered within 30 seconds of the translation starting
- **THEN** the request is aborted
- **AND** the result is a timeout error, not aborted

### Requirement: Provider failures map to fixed messages

Provider and network failures SHALL resolve as error results whose messages are our own fixed copy, chosen by failure class: rejected credentials (401/403), unknown endpoint or model (404), rate limit (429), provider-side failure (5xx), other HTTP status, and unreachable provider (network failure, including CORS). The provider's error body MAY be read to classify the failure but SHALL NOT appear in any result.

#### Scenario: Rejected API key

- **WHEN** the provider answers 401 or 403
- **THEN** the result is an error saying the API key was rejected

#### Scenario: Unknown endpoint or model

- **WHEN** the provider answers 404
- **THEN** the result is an error pointing at the base URL or model name

#### Scenario: Rate limited

- **WHEN** the provider answers 429
- **THEN** the result is an error saying the provider is rate limiting

#### Scenario: Provider failure

- **WHEN** the provider answers with a 5xx status
- **THEN** the result is an error saying the provider failed

#### Scenario: Unreachable provider

- **WHEN** the request fails before any response (offline, DNS, or blocked by CORS)
- **THEN** the result is an error saying the provider could not be reached, mentioning the base URL and browser access (CORS) as likely causes

#### Scenario: Provider error text is not surfaced

- **WHEN** any provider error is mapped
- **THEN** no text from the provider's error body appears in the result

### Requirement: Successful replies are read through the response contract

For a successful HTTP response, the system SHALL take the first choice's message content and interpret it with the translation response parser. A reply that carries a refusal or no string content SHALL resolve as an error and SHALL NOT be parsed.

#### Scenario: Valid structured reply

- **WHEN** the provider answers 200 with message content `{"detected_lang":"pl","translation":"coffee"}` for the pair `pl-PL` / `en`
- **THEN** the result is a translation from `pl-PL` to `en` with `coffee`

#### Scenario: Refusal

- **WHEN** the provider answers 200 with a refusal in the message
- **THEN** the result is an error saying the model declined to translate
- **AND** the refusal text is not surfaced

#### Scenario: Missing content

- **WHEN** the provider answers 200 without a string message content, or with an unexpected body shape
- **THEN** the result is an error

### Requirement: Translation calls never throw

A translation call SHALL always resolve with an outcome and SHALL never reject or throw. The outcome is a translation, an off-pair rejection, a guard rejection, an error, or aborted. Every error outcome SHALL carry the original input text.

#### Scenario: Unexpected failure is returned

- **WHEN** reading the provider response fails in an unforeseen way (e.g. the body is not JSON)
- **THEN** the call resolves with an error outcome rather than rejecting

#### Scenario: Error keeps the input

- **WHEN** any error outcome is produced
- **THEN** it carries the original input text

### Requirement: API key is confined to the authorization header

The API key SHALL be sent only as a bearer token in the `Authorization` header of requests to the configured base URL. It SHALL NOT appear in the URL, in any result or message, or in console output. Requests SHALL send no cookies or referrer.

#### Scenario: Key is sent as a bearer token

- **WHEN** a translation is requested with API key `sk-test`
- **THEN** the request carries `Authorization: Bearer sk-test`
- **AND** the request URL does not contain `sk-test`

#### Scenario: Key never appears in results

- **WHEN** any outcome is produced, including errors whose provider body contains the key
- **THEN** the outcome does not contain the API key

#### Scenario: No ambient credentials

- **WHEN** a request is sent
- **THEN** it omits cookies and the referrer
