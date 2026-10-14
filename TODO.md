# TODO

## current work

- finish `beta-readiness`: OpenSpec verification and code review before the implementation commit; production-build iframe smoke checks passed, including clipboard fallback and first-run setup
- default model and prompt changes are implemented; RouteLLM / `gpt-4.1-mini` passed the local 39-run acceptance matrix (2026-10-14); direct OpenAI remains untested
- complete the deployment/start.me release checklist in `README.md` before announcing beta

## deferred follow-ups

- response schema: Gemini models via RouteLLM reject `type: ['string', 'null']` (400, shown as generic "HTTP 400") — consider `anyOf` / nullable form, or map to the structured-output message → `translation`
- validate additional provider/model combinations before listing them as tested; current evidence is in `README.md`
- `postmessage-api` → embedding — optional host prefill/read integration; revisit when a host needs it

## polish pass (end of project)

- off-pair message shows raw tags ("appears to be in de, which is not pl or en") — use language names
- after clicking Translate, focus stays on the button — return it to the textarea (nicer in the compact widget)
- 403 from RouteLLM on a bad key shows "refused… check the API key and access" rather than "key rejected" — consider wording that leads with the key
