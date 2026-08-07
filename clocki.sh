#!/usr/bin/env bash
CLOCKI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON="$CLOCKI_DIR/node_modules/electron/dist/electron"
MAIN="$CLOCKI_DIR/dist/main.js"

exec "$ELECTRON" "$MAIN" "$@" --no-sandbox --disable-gpu >> /tmp/clocki.log 2>&1
