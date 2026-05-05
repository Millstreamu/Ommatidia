#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == "" ]]; then
  echo "Usage: $0 <session-count> <session-duration-seconds> [pause-seconds]" >&2
  exit 1
fi

SESSION_COUNT="$1"
SESSION_DURATION_SECONDS="${2:-${BEEBOT_BATCH_WAIT_SECONDS:-300}}"
PAUSE_SECONDS="${3:-${BEEBOT_BATCH_PAUSE_SECONDS:-0}}"

if ! [[ "$SESSION_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo "Session count must be a positive integer" >&2
  exit 1
fi
if ! [[ "$SESSION_DURATION_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Session duration seconds must be a non-negative integer" >&2
  exit 1
fi
if ! [[ "$PAUSE_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Pause seconds must be a non-negative integer" >&2
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

count_stood_aside=0
count_acted_no_fill=0
count_acted_opened=0
count_acted_round_trip=0
count_blocked=0
count_refused=0
latest_acted_session="none"
latest_round_trip_session="none"
latest_no_fill_session="none"

for ((i=1; i<=SESSION_COUNT; i++)); do
  session_label="$(printf '%02d' "$i")"
  session_start_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "[batch] session $i/$SESSION_COUNT start"
  bash -lc "$SESSION_START_CMD"

  sleep "$SESSION_DURATION_SECONDS"

  if bash -lc "$SESSION_STOP_CMD"; then
    exit_executed="yes"
  else
    exit_executed="no"
  fi

  "$RUN_REVIEW_CMD"
  session_stop_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  artifact_generated_utc="$session_stop_utc"

  review_dest="$RUN_DIR/session-$session_label-review.md"
  raw_dest="$RUN_DIR/session-$session_label-raw.txt"
  cp "$SOURCE_REVIEW_RAW" "$raw_dest"

  status="$(grep -Eoi 'stood_aside|acted_no_fill|acted_opened|acted_round_trip|blocked|refused' "$SOURCE_REVIEW_MD" | tail -n 1 || true)"
  ended_flat="no"
  case "$status" in
    stood_aside|acted_no_fill|blocked|refused|acted_round_trip) ended_flat="yes" ;;
  esac

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
    echo "- artifact_generated_utc: $artifact_generated_utc"
    echo
    echo "## Current session verdict"
    echo "- entry_executed: yes"
    echo "- exit_executed: $exit_executed"
    echo "- ended_flat: $ended_flat"
    echo "- behavior_classification: ${status:-unknown}"
    echo "- top_next_step: $top_next_step_line"
    echo
    cat "$SOURCE_REVIEW_MD"
  } > "$review_dest"

  case "$status" in
    stood_aside) ((count_stood_aside+=1)) ;;
    acted_no_fill) ((count_acted_no_fill+=1)); latest_acted_session="$session_label"; latest_no_fill_session="$session_label" ;;
    acted_opened) ((count_acted_opened+=1)); latest_acted_session="$session_label" ;;
    acted_round_trip) ((count_acted_round_trip+=1)); latest_acted_session="$session_label"; latest_round_trip_session="$session_label" ;;
    blocked) ((count_blocked+=1)) ;;
    refused) ((count_refused+=1)) ;;
  esac

  echo "[batch] session $i status: ${status:-unknown}"
  if [[ "$i" -lt "$SESSION_COUNT" && "$PAUSE_SECONDS" -gt 0 ]]; then
    echo "[batch] pause $PAUSE_SECONDS seconds"
    sleep "$PAUSE_SECONDS"
  fi
done

if [[ "$latest_acted_session" == "none" ]]; then
  next_step="No acted sessions yet. Extend supervised runtime or revisit market readiness assumptions before changing any thresholds."
else
  next_step="Review session-$latest_acted_session-review.md first, then confirm whether current safety gates allow another bounded supervised cycle unchanged."
fi

artifact_generated_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$RUN_DIR/batch-summary.md" <<EOF
# BeeBot supervised batch summary

## Batch metadata
- batch_timestamp_utc: $RUN_TS
- git_branch: $current_branch
- git_commit: $current_commit
- artifact_generated_utc: $artifact_generated_utc
- total_sessions_run: $SESSION_COUNT
- session_duration_seconds: $SESSION_DURATION_SECONDS
- pause_seconds_between_sessions: $PAUSE_SECONDS

## Batch rollup
- stood_aside: $count_stood_aside
- acted_no_fill: $count_acted_no_fill
- acted_opened: $count_acted_opened
- acted_round_trip: $count_acted_round_trip
- blocked: $count_blocked
- refused: $count_refused

## Session markers
- latest_acted_session: $latest_acted_session
- latest_round_trip_session: $latest_round_trip_session
- latest_no_fill_session: $latest_no_fill_session

## Operator next step
$next_step
EOF

echo "[batch] artifacts: $RUN_DIR"
