# Low-Risk BeeBot Cleanup Notes

## Scope and guardrails

This cleanup intentionally avoided any trading/runtime behavior changes. No strategy, thresholds, safety gates, risk caps, or execution-path logic were modified.

## Safe cleanup applied now

1. **Clarified operator command guidance in docs to reduce workflow confusion**
   - Updated `README.md` to prioritize stable `ops/*` shortcuts (`ops/session-batch`) and explicitly label legacy wrappers (`ops/run-session-batch.sh`, `ops/run-batch`) as compatibility aliases.
   - This is documentation-only and does not change command behavior.

2. **Reduced duplicate guidance in operator catalog**
   - Removed a redundant repeated "Safety / status commands" section from `ops/COMMANDS.md`.
   - Kept all actionable command references intact.

## Left alone intentionally (high-confidence caution)

1. **`ops/run-review` and `ops/review-current-session.sh`**
   - These appear duplicative, but are explicitly referenced in tests and docs and may be used by operator environment hooks.

2. **`ops/run-batch` and `ops/run-session-batch.sh`**
   - `ops/run-batch` is a thin wrapper and could be redundant, but it is documented as a convenience alias and may be used in external operator scripts.

3. **Batch/session artifact generation details**
   - No changes made to classification parsing, counters, metadata fields, or output templates to avoid runtime/reporting regressions.

## Probably redundant but should verify later

1. **Legacy wrapper command retirement plan**
   - Verify real usage telemetry/logs for `ops/run-batch` and `ops/review-current-session.sh`.
   - If unused, deprecate for one release (docs warning), then remove with test updates.

2. **Operator docs consolidation**
   - `README.md` and `ops/COMMANDS.md` still overlap. Consider creating a single source-of-truth section plus short pointers.

3. **`ops/menu` interactive script relevance**
   - May be low-value in non-interactive CI/Codespaces flows; keep for now until operator feedback confirms removal safety.
