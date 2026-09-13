#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repository="$(cd "$root/../.." && pwd)"
port="${PULSE_PORT:-4175}"
bash "$root/scripts/configure-adb-reverse.sh" "$port"
build="$root/build/sample-social"
pid_file="$build/server.pid"
compiler_pid_file="$build/compiler.pid"
log_file="$build/server.log"
compiler_log_file="$build/compiler.log"

mkdir -p "$build"

for process_file in "$pid_file" "$compiler_pid_file"; do
  if [[ -f "$process_file" ]]; then
    kill "$(cat "$process_file")" 2>/dev/null || true
    rm -f "$process_file"
  fi
done

"$repository/node_modules/.bin/tsc" \
  --project "$repository/tsconfig.build.json" \
  --watch \
  --preserveWatchOutput \
  >"$compiler_log_file" 2>&1 &
compiler_pid=$!
printf '%s\n' "$compiler_pid" >"$compiler_pid_file"

env PULSE_DEVELOPMENT=1 ANGULAR_TS_DISTRIBUTION="$repository/.build" \
  node "$root/sample-social-server/server.mjs" --port "$port" \
  >"$log_file" 2>&1 &
server_pid=$!
printf '%s\n' "$server_pid" >"$pid_file"

cleanup() {
  trap - EXIT
  kill "$server_pid" "$compiler_pid" 2>/dev/null || true
  wait "$server_pid" "$compiler_pid" 2>/dev/null || true
  rm -f "$pid_file" "$compiler_pid_file"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

for _ in {1..50}; do
  if curl --fail --silent "http://127.0.0.1:$port/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat "$log_file" >&2
    exit 1
  fi
  sleep 0.1
done

device_count="$(adb devices | awk 'NR > 1 && $2 == "device" { count++ } END { print count + 0 }')"
if [[ "$device_count" != "1" ]]; then
  echo "Connect or start exactly one Android emulator before launching Pulse." >&2
  exit 1
fi

"$root/gradlew" -p "$root" sample-social:installDebug
adb shell am force-stop io.github.angularwave.android.samples.pulse
adb shell am start \
  -n io.github.angularwave.android.samples.pulse/io.github.angularwave.android.navigation.activities.AngularNativeHostActivity

echo "Pulse is running with live reload. Press Ctrl-C to stop."
echo "Logs: $log_file and $compiler_log_file"

set +e
wait -n "$server_pid" "$compiler_pid"
status=$?
set -e
echo "Pulse development process stopped unexpectedly." >&2
exit "$status"
