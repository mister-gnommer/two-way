---
description: "Grill a change's planning artifacts and record settled decisions in a supplementary ledger"
---

Interview (grill) an existing OpenSpec change's planning artifacts before implementation,
recording every settled decision in a change-local **supplementary** ledger.

The ledger is a decision record, never a source of truth: `proposal.md`, the delta specs
under `specs/`, and `design.md` remain canonical and supersede it on any contradiction.
Folding settled decisions into those canonical artifacts is `/opsx-update`'s job, not this
command's.

**Input**: Optionally a change name after `/opsx-grill` (e.g. `/opsx-grill translate-core`).
**Provided arguments**: $ARGUMENTS

**Store selection:** If the change lives in a registered store, run `openspec store list
--json` and pass `--store <id>` on `status` and `instructions` below. Without a store,
commands act on the nearest local `openspec/` root.

**This command depends on the `grill-me-with-ledger` skill.** If it is unavailable in the
session, stop and ask the user to make it available — do not improvise a different
interview.

## Steps

1. **Select the change**

   If a name is provided, use it. Otherwise infer from conversation context, or
   auto-select if only one active change exists. If ambiguous, run `openspec list --json`
   and ask the user to choose. Announce: "Using change: <name>" and how to override.

2. **Resolve paths and load context**

   ```bash
   openspec status --change "<name>" --json
   ```

   From the JSON, read `changeRoot` and the existing artifacts via
   `artifactPaths.<id>.existingOutputPaths` (do NOT assume artifact ids or paths).
   Read `openspec/config.yaml` for project `context` and `rules` — treat them as
   constraints, do not copy them into the ledger.

   The ledger path is `<changeRoot>/grilling-ledger.md`.

3. **Open the ledger**

   If the ledger does not exist, create it with this header (fill the real date,
   `yyyy-MM-dd`); otherwise continue it — append new rounds, mark corrections with ↪
   instead of rewriting history:

   ```md
   # Grilling ledger — <change>

   Decision record from the planning interview (started <yyyy-MM-dd>).

   Supplementary discovery artifact. Not canonical: `proposal.md`, the delta specs under
   `specs/`, and `design.md` supersede this file on any contradiction. Settled decisions
   MUST be consolidated into those artifacts via `/opsx-update` before `/opsx-apply`.
   Never consume this ledger as a requirements source.

   - ✅ = final answer explicitly chosen by the user.
   - ◐ = final outcome derived from a conditional answer or accepted follow-up.
   - ↪ = an earlier answer that was later corrected or superseded.
   ```

4. **Grill**

   Invoke the `grill-me-with-ledger` skill in full (it runs the `grilling` skill first).
   Scope the interview to this change's canonical artifacts and to any open questions they
   leave unresolved — do not grill the whole project. Prefer lettered choices for closed
   question sets. Keep the running ledger at the path from step 2, in the skill's shape.

5. **Mark elevation**

   When an answer is marked **elevate**, mark it ⭐ in its round and maintain the
   `### Elevated decisions` section at the top of the ledger. Note each elevated entry
   for the handoff below.

6. **Hand off (guidance only — never act on it)**

   Summarize for the user: the settled decisions, the elevated (⭐) entries, and anything
   still open. Then recommend:

   - `/opsx-update <change>` to fold the settled decisions into `proposal.md`, the specs,
     and `design.md` (elevated entries become `design.md` Decisions entries, D1, D2, …).
   - `/opsx-apply` once the artifacts are coherent.

   Do NOT edit the canonical artifacts yourself, and do NOT run `/opsx-update` — that is
   the user's next step.

## Guardrails

- The ledger is supplementary; `proposal.md`, the specs, and `design.md` are canonical.
- Never edit code, and never write to `proposal.md`, the specs, `design.md`, or `tasks.md`
  — consolidation belongs to `/opsx-update`.
- Do not create canonical artifacts or change the build frontier.
- Do not create a ledger unless this command was explicitly invoked.
