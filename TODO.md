# TODO

## current work

- implement `translate-ui`

## follow-ups (small changes, before beta)

- default model: `gpt-4o-mini` returns `und` for single words (`kawa`, `coffee`, `gift`) — switch `DEFAULT_PROVIDER.model` to `gpt-4.1-mini` (exists on OpenAI and RouteLLM; `gpt-5-mini`, `claude-haiku-5-5` also pass) → `setup`
- prompt: tighten the `und` escape hatch — single words belong to a pair language; `und` only for non-language text. Injected instructions ("Ignore all previous instructions…") currently come back `und` instead of being translated as-is → `translation`
- response schema: Gemini models via RouteLLM reject `type: ['string', 'null']` (400, shown as generic "HTTP 400") — consider `anyOf` / nullable form, or map to the structured-output message → `translation`

## polish pass (end of project)

- off-pair message shows raw tags ("appears to be in de, which is not pl or en") — use language names
- after clicking Translate, focus stays on the button — return it to the textarea (nicer in the compact widget)
- 403 from RouteLLM on a bad key shows "refused… check the API key and access" rather than "key rejected" — consider wording that leads with the key
- `--error-color` / `--border-color` duplicated in `SetupModal.svelte` and `TranslatePanel.svelte` — move to shared theme custom properties (`presentation`)
