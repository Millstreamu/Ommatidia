# BeeBot Operator Command Catalog

This catalog is the operator-first reference for BeeBot supervised workflows.

- Start here for command discovery.
- Use stable **action names** (for future UI buttons):
  - `session_once`
  - `session_batch`
  - `review_latest`
  - `readiness_check`
  - `status_all`

## Current-branch artifact awareness

The latest review artifacts are tracked on the **current git branch**:

- `ops/latest-session-review.md`
- `ops/latest-session-raw.txt`

Codex and operators should review these files from the current branch first, then decide whether to inspect batch artifacts under `ops/batch-runs/`.

---

## Session control

### Action: `session_once`
- **Purpose:** Run one supervised session cycle and immediately generate/update latest review artifacts.
- **Exact command:** `ops/session-once`
- **When to use:** Quick supervised validation loop or before handoff.
- **Common output to expect:** Announces start/stop/review commands and finishes with artifact paths.
- **Cautions:** Uses environment command hooks if set (`BEEBOT_SESSION_START_CMD`, `BEEBOT_SESSION_STOP_CMD`, `BEEBOT_REVIEW_CMD`).

### Action: `session_batch`
- **Purpose:** Run multiple supervised sessions and generate per-session artifacts + batch summary.
- **Exact command:** `ops/session-batch <session-count> [wait-seconds]`
- **When to use:** Multi-session evidence gathering without changing strategy/safety.
- **Common output to expect:** `[batch] session x/y` lines and final run artifact directory.
- **Cautions:** Session count must be a positive integer.

## Diagnostics

### Action: `status_all`
- **Purpose:** Show a concise operator status snapshot (branch, latest artifacts, recent batch runs, safety env hints).
- **Exact command:** `ops/status-all`
- **When to use:** Before running supervised flows or before opening a review.
- **Common output to expect:** Current branch/commit, artifact freshness, and available shortcuts.
- **Cautions:** Informational only; does not run sessions.

### Action: `readiness_check`
- **Purpose:** Run a safe preflight summary before attempting supervised runtime.
- **Exact command:** `ops/readiness-check`
- **When to use:** Before `session_once` or `session_batch`.
- **Common output to expect:** Presence checks for commands/artifacts and environment override visibility.
- **Cautions:** This wrapper is non-invasive and does not call trading/session commands.

## Review workflow

### Action: `review_latest`
- **Purpose:** Open the current-branch latest review artifacts summary and guidance.
- **Exact command:** `ops/review-latest`
- **When to use:** Immediately after a supervised run or during operator/Codex review.
- **Common output to expect:** Branch reminder and top section preview from `ops/latest-session-review.md`.
- **Cautions:** If artifacts are missing, run `session_once` or your normal review generator first.

### Action: `run_review_commit`
- **Purpose:** Commit latest review artifacts on current branch when changed.
- **Exact command:** `ops/run-review`
- **When to use:** You intentionally want to checkpoint latest review artifacts in git.
- **Common output to expect:** Commit created yes/no, ahead count, next push command.
- **Cautions:** Commits to current branch, not automatically to `main`.

## Readiness / attempt-now workflow

Recommended bounded flow:

1. `ops/help`
2. `ops/readiness-check`
3. `ops/session-once`
4. `ops/review-latest`

For repeated supervised attempts:

1. `ops/readiness-check`
2. `ops/session-batch <n> [wait-seconds]`
3. `ops/review-latest`
4. Inspect newest `ops/batch-runs/<timestamp>/batch-summary.md`

## Batch/session review workflow

If batch artifacts exist:

1. Open newest `ops/batch-runs/<timestamp>/batch-summary.md`.
2. Drill into that run's latest acted session review (`session-<n>-review.md`) when present.
3. Use `ops/review-latest` for current-branch latest artifact quick view.

## Safety / status commands

### Action: `status_all`
- **Purpose:** Snapshot only; no trading logic changes.
- **Exact command:** `ops/status-all`
- **Cautions:** Does not execute sessions.

### Action: `help`
- **Purpose:** List stable operator actions and quick-start recipes.
- **Exact command:** `ops/help`
- **Cautions:** Documentation-only helper.
