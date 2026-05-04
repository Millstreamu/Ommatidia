# Codex Review Prompt Library (Operator Handoff)

Use these ready-to-copy prompts after running a BeeBot session or batch.

Scope:
- Operator guidance only.
- These prompts do not change app/runtime behavior.

---

## 1) Single latest session review

```text
Review the latest BeeBot session output in this repository.

Please:
1. Find the most recent session run under `ops/`.
2. Summarize what BeeBot attempted, what succeeded, and what failed.
3. Identify any blocked/refused/tooling issues.
4. List concrete next actions for the operator (highest impact first).
5. Call out any risky assumptions or missing evidence.

Return:
- Short summary
- Findings
- Action list
- Open questions
```

## 2) Latest acted session review

```text
Review the latest *acted* BeeBot session in this repository.

Definition of acted session:
- status like `acted_no_fill`, `acted_opened`, or `acted_round_trip`.

Please:
1. Locate the most recent relevant batch under `ops/batch-runs/*/batch-summary.md`.
2. Open the corresponding latest acted `session-<n>-review.md`.
3. Summarize operator-relevant outcomes, risks, and follow-ups.
4. Note whether actions were completed, partially completed, or blocked.

Return:
- Session path reviewed
- Outcome summary
- Risks/issues
- Recommended operator follow-up prompt
```

## 3) Latest batch summary review

```text
Review the most recent BeeBot `batch-summary.md` and prepare an operator handoff.

Please:
1. Identify the latest batch folder in `ops/batch-runs/`.
2. Summarize totals/status categories and the most important anomalies.
3. Highlight sessions that need immediate operator attention.
4. Provide a prioritized checklist for the next Codex run.

Return:
- Batch reviewed
- Key metrics/status notes
- Priority sessions
- Next-run checklist
```

## 4) Compare last 3 acted or no-fill sessions

```text
Compare the last 3 sessions that are either acted (`acted_no_fill`, `acted_opened`, `acted_round_trip`) or no-fill equivalents.

Please:
1. Find the three most recent qualifying session reviews.
2. Compare repeated failure/refusal patterns, tool issues, and workflow gaps.
3. Identify what changed between sessions (better/worse/same).
4. Propose one prompt refinement and one process refinement.

Return:
- Sessions compared (with paths)
- Pattern comparison table
- What improved/regressed
- Recommended prompt/process updates
```

---

## Operator tip

When unsure where to start, run prompt #3 first (latest batch summary), then drill into prompt #2 (latest acted session).
