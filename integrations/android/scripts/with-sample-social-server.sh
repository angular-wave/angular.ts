#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${PULSE_PORT:-4175}"
bash "$root/scripts/configure-adb-reverse.sh" "$port"
log="$(mktemp)"
node "$root/sample-social-server/server.mjs" --port "$port" >"$log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; rm -f "$log"' EXIT

for _ in {1..100}; do
  if curl --fail --silent "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
    "$@"
    exit
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat "$log" >&2
    exit 1
  fi
  sleep 0.1
done

cat "$log" >&2
echo "Pulse server did not become ready." >&2
exit 1
