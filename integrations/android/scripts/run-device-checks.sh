#!/usr/bin/env bash
set -euo pipefail

if (( $# < 7 )); then
  echo "Usage: $0 FORM_FACTOR WINDOW_SIZE DENSITY BENCHMARK EVIDENCE_API_LEVEL DEVICE CHECK..." >&2
  exit 64
fi

form_factor=$1
window_size=$2
density=$3
benchmark=$4
evidence_api_level=$5
device=$6
shift 6

wait_for_android() {
  timeout 180 adb wait-for-device

  local deadline=$((SECONDS + 180))
  until [[ $(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r') == 1 ]] &&
    adb shell cmd package list packages >/dev/null 2>&1 &&
    adb shell cmd activity get-config >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      echo "Android did not become ready within 180 seconds." >&2
      return 124
    fi
    sleep 2
  done
}

run_device_check() {
  timeout 12m ./integrations/android/gradlew \
    -p integrations/android \
    --info \
    "-Pandroid.testInstrumentationRunnerArguments.formFactor=$form_factor" \
    "$1"
}

wait_for_android

if [[ $form_factor == foldable ]]; then
  adb emu unfold
  sleep 3
  adb emu posture 2
  sleep 5
fi

if [[ $window_size != default ]]; then
  adb shell wm size "$window_size"
fi

if [[ $density != default ]]; then
  adb shell wm density "$density"
fi

for check in "$@"; do
  set +e
  run_device_check "$check"
  status=$?
  set -e

  if (( status == 124 )); then
    echo "Android device check $check timed out; restarting adb and retrying once."
    ./integrations/android/gradlew -p integrations/android --stop
    adb kill-server
    adb start-server
    wait_for_android
    run_device_check "$check"
  elif (( status != 0 )); then
    exit "$status"
  fi
done

if [[ $benchmark == true ]]; then
  make -C integrations/android benchmark-emulator-smoke-check
fi

./integrations/android/scripts/capture-device-evidence.sh \
  integrations/android/build/connected-device-evidence \
  "$evidence_api_level" \
  "$device"
