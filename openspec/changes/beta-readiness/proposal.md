# Proposal

## Why

Single words and short sentences are two-way's core use case, but the current default model sometimes reports ordinary words and instruction-shaped sentences as undetermined instead of translating them. Before beta, the app needs a more reliable default and prompt, plus clear evidence of which provider/model combinations have actually been tested.

## What Changes

- Change the first-run model default from `gpt-4o-mini` to `gpt-4.1-mini`, retaining the OpenAI base URL and all saved settings.
- Tighten language detection instructions: short or ambiguous linguistic input should use the most likely language in the configured pair; reserve `und` for input with no identifiable natural language. Clearly identifiable languages outside the pair must still be rejected.
- Strengthen the instruction to translate commands, questions, and role-play as text, rather than obeying them or treating their form as a reason to return `und`.
- Define a small manual provider acceptance matrix for ordinary words, ambiguity, embedded instructions, off-pair text, and non-language input. Record actual results separately from model documentation or historical observations.
- Add a README covering setup, tested provider/model combinations, key storage, iframe embedding, and a release checklist for the deployed start.me widget.
- Defer Gemini/RouteLLM schema compatibility, the optional `postMessage` API, and the existing UI polish backlog. Deployment and release publication remain separate operational steps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `setup`: First-run provider defaults use `gpt-4.1-mini`; existing configurations are preserved.
- `translation`: Clarify the prompt's short-input and `und` policy, and strengthen treatment of embedded instructions as translation data.

## Impact

- Implementation: `src/lib/setup.ts` and `src/lib/translate.ts`; relevant existing tests for the prompt/data boundary.
- Documentation: new `README.md`, plus `TODO.md`, `context.md`, and the structure descriptions in `AGENTS.md` as needed to reflect the final change.
- Verification: existing local checks and static build, followed by manual browser/provider acceptance and iframe checks. Real model behavior cannot be established by mocked unit tests.
- No new dependencies, storage migration, response-schema changes, provider endpoint changes, or automatic replacement of users' saved models.
- The README's release checklist will cover Vercel configuration, the public URL and framing headers, and actual start.me use; this change does not authorize publishing a deployment or tag.
