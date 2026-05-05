# Codex Review Prompt Library (Operator Handoff)

Use these ready-to-copy prompts after running a BeeBot session or batch.

Scope:
- Operator guidance only.
- These prompts do not change app/runtime behavior.
- Use **current-branch artifacts only**.
- **Do not run docker, docker-compose, or repository scripts/automation**; perform file-based review only.

---

## 1) Latest session review

```text
Review the latest BeeBot session output using current-branch artifacts only.

Constraints:
- Do not run docker/docker-compose.
- Do not run repo scripts (no ops/* execution, no batch/session runners).
- Use only files already present in this branch.

Please:
1. Start with `ops/latest-session-review.md` and `ops/latest-session-raw.txt` if present.
2. If those are missing, locate the newest session artifact under `ops/` and state what you used.
3. Summarize what BeeBot attempted, what succeeded, and what failed.
4. Identify blocked/refused/tooling issues.
5. List concrete next operator actions (highest impact first).

Return:
- Artifacts reviewed
- Short summary
- Findings
- Action list
- Open questions
```

## 2) Latest acted session review

```text
Review the latest acted BeeBot session using current-branch artifacts only.

Definition of acted session:
- `acted_no_fill`, `acted_opened`, or `acted_round_trip`.

Constraints:
- Do not run docker/docker-compose.
- Do not run repo scripts.
- Use file artifacts already in this branch.

Please:
1. Start from the latest `ops/batch-runs/<timestamp>/batch-summary.md`.
2. Find the most recent acted session referenced there.
3. Open that session's `session-<n>-review.md` (or best available artifact) and summarize outcomes.
4. Note whether results are completed, partially completed, blocked, or refused.
5. Provide operator follow-up actions.

Return:
- Session path reviewed
- Outcome summary
- Risks/issues
- Recommended follow-up prompt
```

## 3) Latest batch summary review

```text
Review the most recent BeeBot batch summary using current-branch artifacts only.

Constraints:
- Do not run docker/docker-compose.
- Do not run repo scripts.
- Use only existing files in this branch.

Please:
1. Identify the latest `ops/batch-runs/<timestamp>/batch-summary.md`.
2. Summarize status totals and the most important anomalies.
3. Highlight sessions needing immediate operator attention.
4. Provide a prioritized checklist for the next Codex review pass.

Return:
- Batch reviewed
- Key metrics/status notes
- Priority sessions
- Next-review checklist
```

## 4) Compare last 3 sessions

```text
Compare the last 3 BeeBot sessions using current-branch artifacts only.

Constraints:
- Do not run docker/docker-compose.
- Do not run repo scripts.
- Use only committed/generated artifacts already present in this branch.

Please:
1. Find the three most recent session review artifacts.
2. Compare repeated blocked/refused/failure patterns and tooling gaps.
3. Call out what improved, regressed, or stayed the same.
4. Propose one prompt refinement and one operator process refinement.

Return:
- Sessions compared (with paths)
- Pattern comparison table
- Improvements/regressions
- Recommended refinements
```

## 5) Investigate inconsistency: session summary vs aggregate metrics

```text
Investigate an inconsistency between a session summary and aggregate metrics using current-branch artifacts only.

Constraints:
- Do not run docker/docker-compose.
- Do not run repo scripts.
- Use only existing branch artifacts.

Please:
1. Identify the latest relevant `batch-summary.md` and linked session review/raw artifacts.
2. Compare per-session fields (`entries_submitted`, `entries_executed`, `exits_submitted`, `exits_executed`, status/outcome tags) against aggregate totals.
3. Pinpoint exactly which metric(s) differ and by how much.
4. Provide likely causes (counting rule mismatch, stale artifact, parsing omission, etc.) with evidence.
5. Provide a concise operator remediation checklist.

Return:
- Artifacts reviewed
- Metrics compared
- Inconsistencies found
- Likely cause(s)
- Remediation checklist
```

---

## Operator tip

When unsure where to start, run prompt #3 first (latest batch summary), then drill into prompt #2 (latest acted session).
