#!/usr/bin/env bash
# set -euo pipefail

# 1) Go to your project root
# cd ORGBRO_X3_BLE_printer_gateway

# 2) Install Python deps
uv pip install -r requirements.txt

# 3) Cross‑platform “open URL” helper
open_url() {
  local url=$1
  case "$OSTYPE" in
    darwin*)    open "$url" ;;
    linux*)     xdg-open "$url" ;;
    msys*|cygwin*) start "$url" ;;
    *)          echo "👉 Please open $url manually" ;;
  esac
}

# 4) Start backend and frontend in background
( cd backend && uv run app.py ) &
BACK_PID=$!
( cd client && pnpm install && pnpm run dev ) &
CLIENT_PID=$!

# 5) Give the frontend a few seconds to bind, then open the browser
sleep 3
open_url "http://localhost:5174" &

# 6) Wait for both processes
wait $BACK_PID $CLIENT_PID
