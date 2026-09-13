#!/usr/bin/env bash
set -euo pipefail

port="${1:?Usage: configure-adb-reverse.sh PORT}"
mapfile -t devices < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

if [[ "${#devices[@]}" -eq 0 ]]; then
  echo "No authorized Android device is available." >&2
  exit 1
fi

for device in "${devices[@]}"; do
  adb -s "$device" reverse "tcp:$port" "tcp:$port"
done
