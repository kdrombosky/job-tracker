#!/usr/bin/env bash
# Runs backend (FastAPI, hot reload) and frontend (Vite, hot reload) at the
# same time for local testing. Ctrl+C stops both. This runs everything
# NATIVELY (venv + npm), not through Docker — same tradeoff as `npm run
# dev` vs. a full container build: faster iteration with hot reload, at
# the cost of not being byte-for-byte what actually runs in prod. Use
# `docker-compose up --build` instead when you specifically want to test
# the containerized version.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Backend venv location varies by how you set it up — try the common spots
# rather than assuming one. (Earlier error tracebacks in this project
# showed it living at the repo root, not inside backend/, so that's
# checked first, but both are supported.)
VENV_ACTIVATE=""
for candidate in "$ROOT_DIR/.venv/bin/activate" "$ROOT_DIR/backend/.venv/bin/activate"; do
  if [ -f "$candidate" ]; then
    VENV_ACTIVATE="$candidate"
    break
  fi
done

if [ -z "$VENV_ACTIVATE" ]; then
  echo "Couldn't find a venv at .venv/ or backend/.venv/ — create one first:"
  echo "  python3 -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt"
  exit 1
fi

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "backend/.env is missing — copy backend/.env.example and fill it in first."
  exit 1
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "frontend/node_modules is missing — install dependencies first:"
  echo "  cd frontend && npm install"
  exit 1
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Stopping backend and frontend..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:8000 ..."
(
  cd "$ROOT_DIR/backend"
  source "$VENV_ACTIVATE"
  # python -m uvicorn (not bare `uvicorn`) so the current directory reliably
  # ends up on sys.path — the same ModuleNotFoundError class of issue we
  # hit with bare `pytest` earlier applies here too.
  python -m uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "Both running. Ctrl+C to stop."
wait
