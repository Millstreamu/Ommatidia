#!/usr/bin/env bash
set -euo pipefail

echo "Starting API (http://localhost:3001) and Web (http://localhost:3000)..."

cleanup() {
  kill 0
}
trap cleanup EXIT INT TERM

npm run start --workspace @ommatidia/api &
npm run start --workspace @ommatidia/web &

wait
