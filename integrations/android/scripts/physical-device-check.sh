#!/usr/bin/env bash
set -euo pipefail

adb_command="${ADB:-adb}"
expected_api="${EXPECTED_ANDROID_API:-}"
if [[ -n "$expected_api" && ! "$expected_api" =~ ^[0-9]+$ ]]; then
    printf 'Expected Android API level must be numeric, got %s.\n' "$expected_api" >&2
    exit 1
fi

if ! command -v "$adb_command" >/dev/null 2>&1; then
    printf 'adb is required for Android physical-device checks.\n' >&2
    exit 1
fi

mapfile -t serials < <(
    "$adb_command" devices | awk 'NR > 1 && $2 == "device" { print $1 }'
)
if [[ "${#serials[@]}" -ne 1 ]]; then
    printf 'Expected exactly one authorized Android device, found %s.\n' \
        "${#serials[@]}" >&2
    exit 1
fi

serial="${serials[0]}"
property() {
    "$adb_command" -s "$serial" shell getprop "$1" | tr -d '\r'
}

qemu="$(property ro.kernel.qemu)"
hardware="$(property ro.hardware)"
if [[ "$serial" == emulator-* || "$qemu" == 1 || "$hardware" =~ ^(goldfish|ranchu)$ ]]; then
    printf 'Android physical-device checks reject emulator %s (%s).\n' \
        "$serial" "$hardware" >&2
    exit 1
fi

sdk="$(property ro.build.version.sdk)"
if [[ ! "$sdk" =~ ^[0-9]+$ ]]; then
    printf 'Device %s reported invalid Android API level %s.\n' "$serial" "$sdk" >&2
    exit 1
fi
if [[ -n "$expected_api" && "$sdk" != "$expected_api" ]]; then
    printf 'Expected Android API %s, device reports API %s.\n' "$expected_api" "$sdk" >&2
    exit 1
fi

printf 'Using physical Android device %s: %s, API %s, %s.\n' \
    "$serial" \
    "$(property ro.product.model)" \
    "$sdk" \
    "$(property ro.build.fingerprint)"
