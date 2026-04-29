#!/usr/bin/env bash
set -euo pipefail

echo "Starting development servers..."
echo "Web UI: http://localhost:3000"
echo "API:    http://localhost:3001"
echo "Codespaces: open the forwarded port 3000 to use the web UI."

cleanup() {
  kill 0
}
trap cleanup EXIT INT TERM

npm run start --workspace @ommatidia/api &
npm run start --workspace @ommatidia/web &

wait
