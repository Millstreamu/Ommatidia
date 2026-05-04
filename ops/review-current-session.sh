#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REVIEW_MD="${BEEBOT_REVIEW_MD_PATH:-$SCRIPT_DIR/latest-session-review.md}"
REVIEW_RAW="${BEEBOT_REVIEW_RAW_PATH:-$SCRIPT_DIR/latest-session-raw.txt}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: must run inside a git repository." >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"

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
