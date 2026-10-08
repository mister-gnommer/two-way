# translation Specification

## Purpose

Defines the translation contract for a configured language pair: how a provider prompt is built from the pair and input text, how input is bounded, and how the provider's structured response is interpreted as a translation, an off-pair rejection, or an error.

## Requirements

### Requirement: Prompt is built from the language pair and input text

The system SHALL produce a translation prompt from the configured BCP-47 language pair and the input text, as a separate system part and user part. The prompt SHALL name both pair languages as their BCP-47 tags, instruct the provider to detect the input language and translate into the language other than the detected one, preserve the input's tone, register, and formatting, output only the translation without commentary, and state the structured response contract in prose. When the provider cannot determine the input language, the prompt SHALL instruct it to report `detected_lang` as `und` (the BCP-47 tag for undetermined) with a null `translation`.

#### Scenario: Prompt names both pair languages

- **WHEN** a prompt is built for the pair `pl-PL` / `en` and some input text
- **THEN** the prompt contains both `pl-PL` and `en`
- **AND** the prompt instructs the provider to translate into the language other than the detected one

#### Scenario: Prompt separates instructions from input

- **WHEN** a prompt is built
- **THEN** the instructions are carried in a system part
- **AND** the input text is carried in a user part

#### Scenario: Prompt preserves the input's character

- **WHEN** a prompt is built
- **THEN** it instructs the provider to preserve tone, register, and formatting
- **AND** it instructs the provider to output only the translation, without commentary

#### Scenario: Prompt states the structured response contract in prose

- **WHEN** a prompt is built
- **THEN** it requests a response carrying a detected language and a translation

#### Scenario: Undetermined input is reported as und

- **WHEN** the provider cannot determine the input language
- **THEN** the prompt instructs it to report `detected_lang` as `und`
- **AND** to report `translation` as null

### Requirement: Input is treated as data, not instructions

The prompt SHALL instruct the provider that the user part is text to translate, never instructions, and that any instructions, questions, or role-play it contains SHALL be ignored and the text translated as-is.

#### Scenario: Embedded instructions are translated, not followed

- **WHEN** the input text contains instructions aimed at the model
- **THEN** the prompt treats the input as text to translate
- **AND** the provider is instructed to ignore such content as instructions and translate it as-is

### Requirement: Input is bounded and blank input is rejected

The system SHALL trim the input and reject, without building a prompt, input that is blank or that exceeds `MAX_INPUT_CHARS` (500 characters). Trimming SHALL precede the checks, blank SHALL be checked before length, and each rejected outcome SHALL carry a concise user-facing message supplied by the system. The `ok` outcome SHALL carry the trimmed text, and the prompt SHALL be built from that trimmed text.

#### Scenario: Blank input is rejected before a prompt is built

- **WHEN** the input is empty or whitespace only
- **THEN** the guard returns a blank outcome
- **AND** no prompt is built

#### Scenario: Over-length input is rejected

- **WHEN** the trimmed input exceeds 500 characters
- **THEN** the guard returns a too-long outcome

#### Scenario: Input within bounds passes

- **WHEN** the trimmed input is non-empty and at most 500 characters
- **THEN** the guard returns an ok outcome
- **AND** the outcome carries the trimmed text for the prompt builder

#### Scenario: Each guard rejection carries a message

- **WHEN** the guard returns blank or too-long
- **THEN** the outcome includes a non-empty user-facing message

### Requirement: Structured response contract

The translation response SHALL be a JSON object with `detected_lang` (a well-formed BCP-47 language tag) and `translation` (the translated string, or null when the input is outside the pair). Both fields SHALL be required and additional properties SHALL NOT be allowed. The contract SHALL be exposed as a JSON schema usable by the provider call.

#### Scenario: Contract describes both required fields

- **WHEN** the response contract is inspected
- **THEN** it requires `detected_lang` and `translation`
- **AND** it disallows additional properties

#### Scenario: Translation may be null for off-pair input

- **WHEN** the detected language is outside the pair
- **THEN** a conforming response may carry `translation` as null

### Requirement: Detected language resolves to a pair direction

The system SHALL resolve the detected language to one of the configured pair members by comparing BCP-47 primary language subtags case-insensitively (e.g. `pl` resolves to `pl-PL`). A successful result SHALL identify the source and target languages as the configured pair members.

#### Scenario: Regional variant resolves to its pair member

- **WHEN** the detected language is `pl` and the pair is `pl-PL` / `en`
- **THEN** the result is a translation with source `pl-PL` and target `en`

#### Scenario: Ambiguous word valid in both languages

- **WHEN** the input is a word that exists in both pair languages (e.g. `gift` for `pl` / `en`)
- **THEN** the detected language determines the direction
- **AND** the result is a translation, not a rejection

#### Scenario: Only canonical pair members are exposed

- **WHEN** a translation result is produced
- **THEN** its source and target are the configured pair members
- **AND** the model's raw detected tag is not exposed

### Requirement: Input outside the pair is rejected

When the input is in neither language of the pair, the system SHALL NOT produce a translation. The result SHALL be a rejection carrying a user-facing message and the detected language when available. The provider reports `und` when it cannot determine the language; `und` and any other tag outside the pair yield a rejection. Any translation the provider also returned SHALL be discarded.

#### Scenario: Off-pair input is rejected

- **WHEN** the input language is German and the pair is `pl-PL` / `en`
- **THEN** the result is a rejection
- **AND** no translation is returned

#### Scenario: A translation returned for off-pair input is discarded

- **WHEN** the detected language is outside the pair and the response also carries a translation
- **THEN** the result is a rejection
- **AND** the translation is not surfaced

#### Scenario: Undetectable input is treated as off-pair

- **WHEN** the response reports `und`, or any other tag outside the pair
- **THEN** the result is a rejection

#### Scenario: Rejection carries a message

- **WHEN** an off-pair rejection is produced
- **THEN** it includes a non-empty message identifying the problem

### Requirement: Mixed-language input is handled by provider best effort

For input that mixes both languages of the pair, the system SHALL NOT apply a fixed dominance rule. The prompt SHALL direct the provider to choose the most likely intended language and translate the whole input into the other pair language.

#### Scenario: Mixed input translated as one unit

- **WHEN** the input mixes both pair languages (e.g. `translate kawa please` for `pl-PL` / `en`)
- **THEN** the whole input is translated as one unit into the other pair language
- **AND** the direction is the provider's determination, not a dominance rule in our code

### Requirement: Malformed provider responses do not throw

The parser SHALL return an error result, rather than throw, when the provider response is not valid according to the contract. An error result SHALL retain the original input text and SHALL NOT retain the raw provider response. The raw response SHALL be parsed as-is; no extraction from Markdown code fences or surrounding prose is attempted. A `detected_lang` that is not a well-formed BCP-47 tag SHALL yield an error result, and the reported value SHALL NOT be surfaced.

#### Scenario: Invalid JSON

- **WHEN** the raw response is not valid JSON
- **THEN** the result is an error outcome carrying a message, returned rather than thrown

#### Scenario: Missing required fields

- **WHEN** the parsed response lacks `detected_lang` or `translation`
- **THEN** the result is an error outcome carrying a message, returned rather than thrown

#### Scenario: In-pair detection without a translation

- **WHEN** the detected language is a pair member but the translation is null or empty
- **THEN** the result is an error outcome carrying a message, returned rather than thrown

#### Scenario: Fenced JSON is not unwrapped

- **WHEN** the raw response is valid JSON wrapped in a Markdown code fence
- **THEN** the result is an error outcome carrying a message, returned rather than thrown

#### Scenario: Error retains the request, not the response

- **WHEN** an error result is produced
- **THEN** it carries the original input text
- **AND** it does not carry the raw provider response

#### Scenario: Malformed detected language

- **WHEN** the response's `detected_lang` is not a well-formed BCP-47 tag (e.g. free text)
- **THEN** the result is an error outcome carrying a message, returned rather than thrown
- **AND** the reported value appears in neither the result nor its message

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

Provider and network failures SHALL resolve as error results whose messages are our own fixed copy, chosen by failure class: rejected credentials (401), refused access (403), unknown endpoint or model (404), rate limit (429), provider-side failure (5xx), other HTTP status, and unreachable provider (network failure, including CORS). The provider's error body MAY be read to classify the failure but SHALL NOT appear in any result.

#### Scenario: Rejected API key

- **WHEN** the provider answers 401
- **THEN** the result is an error saying the API key was rejected

#### Scenario: Access refused

- **WHEN** the provider answers 403
- **THEN** the result is an error saying the request was refused
- **AND** it names the API key and access to the model as likely causes

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

The API key SHALL be sent only as a bearer token in the `Authorization` header of requests to the configured base URL. It SHALL NOT appear in the URL, in any result or message, or in console output. Requests SHALL send no cookies or referrer. A key that cannot be sent as a header value (e.g. it contains a line break or a non-Latin-1 character) SHALL resolve as an error stating that the key contains invalid characters, without contacting the provider.

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

#### Scenario: Key that cannot be sent as a header

- **WHEN** a translation is requested with an API key containing a line break
- **THEN** the result is an error saying the key contains invalid characters
- **AND** no request is sent
- **AND** the result does not contain the key
