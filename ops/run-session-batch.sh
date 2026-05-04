#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == "" ]]; then
  echo "Usage: $0 <session-count> [wait-seconds]" >&2
  exit 1
fi

SESSION_COUNT="$1"
WAIT_SECONDS="${2:-${BEEBOT_BATCH_WAIT_SECONDS:-300}}"
if ! [[ "$SESSION_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo "Session count must be a positive integer" >&2
  exit 1
fi
if ! [[ "$WAIT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Wait seconds must be a non-negative integer" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_REVIEW_CMD="${BEEBOT_REVIEW_CMD:-$SCRIPT_DIR/run-review}"
SESSION_START_CMD="${BEEBOT_SESSION_START_CMD:-true}"
SESSION_STOP_CMD="${BEEBOT_SESSION_STOP_CMD:-true}"
SOURCE_REVIEW_MD="${BEEBOT_REVIEW_MD_PATH:-$SCRIPT_DIR/latest-session-review.md}"
SOURCE_REVIEW_RAW="${BEEBOT_REVIEW_RAW_PATH:-$SCRIPT_DIR/latest-session-raw.txt}"
BATCH_ROOT="${BEEBOT_BATCH_ROOT:-$SCRIPT_DIR/batch-runs}"

if [[ ! -x "$RUN_REVIEW_CMD" ]]; then
  echo "Review command not executable: $RUN_REVIEW_CMD" >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
current_commit="$(git rev-parse HEAD 2>/dev/null || echo unknown)"

RUN_TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$BATCH_ROOT/$RUN_TS"
mkdir -p "$RUN_DIR"

generation_ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

count_stood_aside=0
count_acted_no_fill=0
count_acted_opened=0
count_acted_round_trip=0
count_blocked=0
count_refused=0
latest_acted_session="none"
latest_round_trip_session="none"

for ((i=1; i<=SESSION_COUNT; i++)); do
  session_start_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "[batch] session $i/$SESSION_COUNT start"
  bash -lc "$SESSION_START_CMD"
  entry_executed="yes"

  sleep "$WAIT_SECONDS"

  if bash -lc "$SESSION_STOP_CMD"; then
    exit_executed="yes"
  else
    exit_executed="no"
  fi

  "$RUN_REVIEW_CMD"
  session_stop_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  review_dest="$RUN_DIR/session-$i-review.md"
  raw_dest="$RUN_DIR/session-$i-raw.txt"
  cp "$SOURCE_REVIEW_RAW" "$raw_dest"

  status="$(grep -Eoi 'stood_aside|acted_no_fill|acted_opened|acted_round_trip|blocked|refused' "$SOURCE_REVIEW_MD" | tail -n 1 || true)"
  ended_flat="no"
  case "$status" in
    stood_aside|acted_no_fill|blocked|refused|acted_round_trip) ended_flat="yes" ;;
    acted_opened) ended_flat="no" ;;
    *) ended_flat="no" ;;
  esac
  behavior_classification="${status:-unknown}"

  top_next_step_line="$(awk '/^## Top next step/{getline; gsub(/^\s+|\s+$/, "", $0); print; exit}' "$SOURCE_REVIEW_MD" || true)"
  if [[ -z "$top_next_step_line" ]]; then
    top_next_step_line="Review this session artifact before changing thresholds or safety rules."
  fi

  {
    echo "# BeeBot session review artifact"
    echo
    echo "## Artifact metadata"
    echo "- artifact_type: single_session_review"
    echo "- reviewed_session_id: $i"
    echo "- session_start_utc: $session_start_utc"
    echo "- session_stop_utc: $session_stop_utc"
    echo "- git_branch: $current_branch"
    echo "- git_commit: $current_commit"
    echo "- artifact_generated_utc: $generation_ts"
    echo
    echo "## Current session verdict"
    echo "- entry_executed: $entry_executed"
    echo "- exit_executed: $exit_executed"
    echo "- ended_flat: $ended_flat"
    echo "- behavior_classification: $behavior_classification"
    echo "- top_next_step: $top_next_step_line"
    echo
    cat "$SOURCE_REVIEW_MD"
  } > "$review_dest"

  case "$status" in
    stood_aside) ((count_stood_aside+=1)) ;;
    acted_no_fill) ((count_acted_no_fill+=1)); latest_acted_session="$i" ;;
    acted_opened) ((count_acted_opened+=1)); latest_acted_session="$i" ;;
    acted_round_trip) ((count_acted_round_trip+=1)); latest_acted_session="$i"; latest_round_trip_session="$i" ;;
    blocked) ((count_blocked+=1)) ;;
    refused) ((count_refused+=1)) ;;
    *) ;;
  esac
  echo "[batch] session $i status: ${status:-unknown}"
done

if [[ "$latest_acted_session" == "none" ]]; then
  next_step="No acted sessions yet. Extend supervised runtime or revisit market readiness assumptions before changing any thresholds."
else
  next_step="Review session-$latest_acted_session-review.md first, then confirm whether current safety gates allow another bounded supervised cycle unchanged."
fi

cat > "$RUN_DIR/batch-summary.md" <<EOF_SUM
# BeeBot supervised batch summary

## Artifact metadata
- artifact_type: batch_summary
- reviewed_session_id: batch_$RUN_TS
- session_start_utc: unknown
- session_stop_utc: unknown
- git_branch: $current_branch
- git_commit: $current_commit
- artifact_generated_utc: $generation_ts

## Current session verdict
- entry_executed: yes
- exit_executed: yes
- ended_flat: n/a
- behavior_classification: batch_aggregate
- top_next_step: $next_step

## Batch rollup
- batch_timestamp_utc: $RUN_TS
- total_sessions_run: $SESSION_COUNT
- stood_aside: $count_stood_aside
- acted_no_fill: $count_acted_no_fill
- acted_opened: $count_acted_opened
- acted_round_trip: $count_acted_round_trip
- blocked: $count_blocked
- refused: $count_refused
- latest_acted_session: $latest_acted_session
- latest_round_trip_session: $latest_round_trip_session

## Operator next step
$next_step
EOF_SUM

echo "[batch] artifacts: $RUN_DIR"
