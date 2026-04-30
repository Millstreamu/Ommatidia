#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "[update] Stopping local API process pattern: node dist/index.js"
pkill -f "node dist/index.js" >/dev/null 2>&1 || true

if [[ -n "$(git status --porcelain)" ]]; then
  printf '%s\n' "[update] You have uncommitted changes. Commit/stash them or ask for help before updating."
  exit 1
fi

printf '%s\n' "[update] Pulling latest changes from git..."
git pull

install_failed=0
printf '%s\n' "[update] Installing dependencies (npm install)..."
if ! npm install; then
  install_failed=1
  if [[ -d node_modules ]]; then
    printf '%s\n' "[update] npm install failed, but node_modules exists. Continuing with existing dependencies."
  else
    printf '%s\n' "[update] npm install failed and node_modules is missing. Resolve install issues, then retry make update."
    exit 1
  fi
fi

if [[ "$install_failed" -eq 1 ]]; then
  printf '%s\n' "[update] Continuing with previously installed dependencies."
fi

printf '%s\n' "[update] Building repository..."
npm run build

printf '%s\n' "[update] Running checks (make check)..."
make check

printf '\n%s\n' "Update complete."
printf '%s\n' "Run make start to launch the app."
printf '%s\n' "Open forwarded port 3000 in Codespaces."
