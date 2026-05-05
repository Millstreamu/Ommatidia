#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REVIEW_MD="${BEEBOT_REVIEW_MD_PATH:-$SCRIPT_DIR/latest-session-review.md}"
REVIEW_RAW="${BEEBOT_REVIEW_RAW_PATH:-$SCRIPT_DIR/latest-session-raw.txt}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: must run inside a git repository." >&2
  exit 1
fi


decorate_single_session_review() {
  local artifact_generated_utc session_id session_start_utc session_stop_utc entry_executed exit_executed status ended_flat top_next_step_line tmp_file

  if grep -q '^## Artifact metadata$' "$REVIEW_MD" && grep -q '^## Current session verdict$' "$REVIEW_MD"; then
    return 0
  fi

  artifact_generated_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  session_id="${BEEBOT_SESSION_ID:-latest}"
  session_start_utc="${BEEBOT_SESSION_START_UTC:-unknown}"
  session_stop_utc="${BEEBOT_SESSION_STOP_UTC:-$artifact_generated_utc}"
  entry_executed="${BEEBOT_ENTRY_EXECUTED:-no}"
  exit_executed="${BEEBOT_EXIT_EXECUTED:-no}"

  status="$(grep -Eoi 'stood_aside|acted_no_fill|acted_opened|acted_round_trip|blocked|refused' "$REVIEW_MD" | tail -n 1 || true)"
  if [[ -z "$status" ]]; then
    status="unknown"
  fi

  ended_flat="no"
  case "$status" in
    stood_aside|acted_no_fill|blocked|refused|acted_round_trip) ended_flat="yes" ;;
  esac

  top_next_step_line="$(awk '/^## Top next step/{getline; gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0); print; exit}' "$REVIEW_MD" || true)"
  if [[ -z "$top_next_step_line" ]]; then
    top_next_step_line="Review this session artifact before changing thresholds or safety rules."
  fi

  tmp_file="$(mktemp)"
  {
    echo "# BeeBot session review artifact"
    echo
    echo "## Artifact metadata"
    echo "- artifact_type: single-session"
    echo "- session_id: $session_id"
    echo "- session_start_utc: $session_start_utc"
    echo "- session_stop_utc: $session_stop_utc"
    echo "- artifact_generated_at_utc: $artifact_generated_utc"
    echo "- git_branch: $current_branch"
    echo "- git_commit: $current_commit"
    echo
    echo "## Current session verdict"
    echo "- entry_executed: $entry_executed"
    echo "- exit_executed: $exit_executed"
    echo "- ended_flat: $ended_flat"
    echo "- behavior_classification: $status"
    echo "- top_next_step: $top_next_step_line"
    echo
    echo "## Original review artifact"
    echo
    cat "$REVIEW_MD"
  } > "$tmp_file"
  mv "$tmp_file" "$REVIEW_MD"
}

current_branch="$(git rev-parse --abbrev-ref HEAD)"
current_commit="$(git rev-parse HEAD 2>/dev/null || echo unknown)"

printf 'BeeBot review artifact git update\n'
printf 'Current branch: %s\n' "$current_branch"
printf 'Artifact markdown: %s\n' "$REVIEW_MD"
printf 'Artifact raw text: %s\n' "$REVIEW_RAW"

if [[ "$current_branch" != "main" ]]; then
  echo "WARNING: Artifacts are being committed to the current branch, not automatically to main."
fi

missing=0
for artifact in "$REVIEW_MD" "$REVIEW_RAW"; do
  if [[ ! -f "$artifact" ]]; then
    echo "Missing required artifact: $artifact" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

decorate_single_session_review

changed=0
for artifact in "$REVIEW_MD" "$REVIEW_RAW"; do
  if ! git diff --quiet -- "$artifact" || ! git diff --cached --quiet -- "$artifact"; then
    changed=1
    break
  fi
  if [[ -n "$(git ls-files --others --exclude-standard -- "$artifact")" ]]; then
    changed=1
    break
  fi
done

if [[ "$changed" -eq 1 ]]; then
  git add -- "$REVIEW_MD" "$REVIEW_RAW"
  commit_message="ops: update latest BeeBot session review artifacts"
  git commit -m "$commit_message" >/dev/null
  commit_created="yes"
else
  commit_created="no"
fi

ahead_count="$(git rev-list --count "origin/$current_branch..$current_branch" 2>/dev/null || echo unknown)"

printf 'Commit created: %s\n' "$commit_created"
printf 'Ahead of origin/%s: %s commit(s)\n' "$current_branch" "$ahead_count"
printf 'Next push command: git push origin %s\n' "$current_branch"
