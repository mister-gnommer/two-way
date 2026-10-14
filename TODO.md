# TODO

## current work

- complete the deployment/start.me release checklist in `README.md` before announcing beta
- direct OpenAI / `gpt-4.1-mini` remains untested; RouteLLM passed the local acceptance matrix (2026-10-14)

## deferred follow-ups

- response schema: Gemini models via RouteLLM reject `type: ['string', 'null']` (400, shown as generic "HTTP 400") — consider `anyOf` / nullable form, or map to the structured-output message → `translation`
- validate additional provider/model combinations before listing them as tested; current evidence is in `README.md`
- `postmessage-api` → embedding — optional host prefill/read integration; revisit when a host needs it

## polish pass (end of project)

- off-pair message shows raw tags ("appears to be in de, which is not pl or en") — use language names
- after clicking Translate, focus stays on the button — return it to the textarea (nicer in the compact widget)
- 403 from RouteLLM on a bad key shows "refused… check the API key and access" rather than "key rejected" — consider wording that leads with the key
