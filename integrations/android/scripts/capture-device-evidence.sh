#!/usr/bin/env bash
set -euo pipefail

android_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_directory="${1:-$android_root/build/connected-device-evidence}"
expected_api="${2:-}"
matrix_device="${3:-local}"
test_package="io.github.angularwave.android.navigation.test"
test_class="io.github.angularwave.android.navigation.elements.NativeElementCatalogInstrumentedTest"
test_method="coreDisplayAndActionElementsRenderAccessiblyAcrossConfigurations"

"$android_root/gradlew" -p "$android_root" :navigation-fragments:assembleDebugAndroidTest

test_apk="$(find \
    "$android_root/navigation-fragments/build/outputs/apk/androidTest/debug" \
    -maxdepth 1 -name '*.apk' -print -quit)"
if [[ -z "$test_apk" ]]; then
    printf 'Android instrumentation APK was not produced.\n' >&2
    exit 1
fi

adb install -r -t "$test_apk" >/dev/null
cleanup() {
    adb uninstall "$test_package" >/dev/null 2>&1 || true
}
trap cleanup EXIT

mkdir -p "$output_directory"

instrumentation_output="$(adb shell am instrument -w -r \
    -e class "$test_class#$test_method" \
    "$test_package/androidx.test.runner.AndroidJUnitRunner")"
printf '%s\n' "$instrumentation_output"
printf '%s\n' "$instrumentation_output" >"$output_directory/instrumentation.txt"
if [[ "$instrumentation_output" != *"OK (1 test)"* ]]; then
    printf 'Android rendering evidence test did not pass.\n' >&2
    exit 1
fi

adb pull \
    "/sdcard/Android/data/$test_package/files/screenshots/." \
    "$output_directory/" >/dev/null

screenshot_count="$(find "$output_directory" -maxdepth 1 -name '*.png' -print | wc -l)"
if [[ "$screenshot_count" -ne 5 ]]; then
    printf 'Expected 5 Android rendering screenshots, found %s.\n' "$screenshot_count" >&2
    exit 1
fi

property() {
    adb shell getprop "$1" | tr -d '\r'
}

sdk="$(property ro.build.version.sdk)"
if [[ -n "$expected_api" && "$sdk" != "$expected_api" ]]; then
    printf 'Expected Android API %s, device reports API %s.\n' "$expected_api" "$sdk" >&2
    exit 1
fi

{
    printf 'capturedAt=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'matrixDevice=%s\n' "$matrix_device"
    printf 'sdk=%s\n' "$sdk"
    printf 'release=%s\n' "$(property ro.build.version.release)"
    printf 'manufacturer=%s\n' "$(property ro.product.manufacturer)"
    printf 'model=%s\n' "$(property ro.product.model)"
    printf 'device=%s\n' "$(property ro.product.device)"
    printf 'abi=%s\n' "$(property ro.product.cpu.abi)"
    printf 'locale=%s\n' "$(property persist.sys.locale)"
    printf 'windowSize=%s\n' "$(adb shell wm size | tr -d '\r')"
    printf 'density=%s\n' "$(adb shell wm density | tr -d '\r')"
    printf 'fontScale=%s\n' "$(adb shell settings get system font_scale | tr -d '\r')"
    printf 'windowAnimationScale=%s\n' \
        "$(adb shell settings get global window_animation_scale | tr -d '\r')"
    printf 'transitionAnimationScale=%s\n' \
        "$(adb shell settings get global transition_animation_scale | tr -d '\r')"
    printf 'animatorDurationScale=%s\n' \
        "$(adb shell settings get global animator_duration_scale | tr -d '\r')"
} >"$output_directory/device.properties"

test_results="$output_directory/test-results"
mkdir -p "$test_results"
result_count=0
while IFS= read -r result; do
    relative="${result#"$android_root/"}"
    module="${relative%%/*}"
    cp "$result" "$test_results/$module-$(basename "$result")"
    result_count=$((result_count + 1))
done < <(
    find "$android_root" \
        -path '*/build/outputs/androidTest-results/connected/*' \
        -type f \
        -name '*.xml' \
        -print
)
if [[ "$result_count" -eq 0 ]]; then
    printf 'No connected Android test results were found.\n' >&2
    exit 1
fi

benchmark_output="$android_root/benchmark/build/outputs/connected_android_test_additional_output"
if [[ -d "$benchmark_output" ]]; then
    mkdir -p "$output_directory/benchmark"
    cp -R "$benchmark_output/." "$output_directory/benchmark/"
fi

(
    cd "$output_directory"
    find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum \
        >SHA256SUMS
)

printf 'Captured Android device evidence with %s test reports in %s.\n' \
    "$result_count" \
    "$output_directory"
