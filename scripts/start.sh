#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "VoyageAtlas startup"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not available in PATH." >&2
  exit 1
fi

if [[ "${1:-}" == "--no-build" ]]; then
  docker compose up -d
else
  docker compose up -d --build
fi

cat <<'EOF'

VoyageAtlas is starting.
Frontend:        http://localhost:3333
Backend API:     http://localhost:8888/docs
MinIO Console:   http://localhost:9991
MinIO login:     minioadmin / minioadmin

Useful commands:
  docker compose logs -f
  docker compose down
EOF
