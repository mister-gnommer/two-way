# Contributing

## Commit Message Convention

### Format

```
<scope>: <description> [spec]
```

- **`scope`** — short noun, lowercase. Use only: `docs`, `feat`, `fix`, `refactor`, `test`, `assets`, `ci`. No new scopes without a reason.
- **`description`** — imperative mood, lowercase, no trailing period.
- **`[spec]`** — optional, tags an Openspec change by its ID, e.g. `[add-setup-modal]`. Omit for cross-cutting work (license, CI, repo meta).

### Examples

```
docs: draft context mem-dump
feat: build setup modal with idb config storage [add-setup-modal]
fix: keep user input on provider error
refactor: extract prompt builder into lib/translate
test: add detection edge cases for ambiguous words
assets: add app icon
ci: pin node version for vercel build
```

### No Commit Body

Do not write commit message bodies. The maintainer reads only subject lines, so information in the body is effectively invisible.

If the subject line can't explain the change, split the commit into smaller pieces — each should be describable in one line.

Exception: tool-generated commits (merge, squash) or Openspec boilerplate may include a body. That's fine as long as you didn't write it.
