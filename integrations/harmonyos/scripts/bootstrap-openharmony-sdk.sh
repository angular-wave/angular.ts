#!/usr/bin/env bash

set -euo pipefail

readonly VERSION="6.1.0.31"
readonly ARCHIVE_URL="https://repo.huaweicloud.com/openharmony/os/6.1-Release/ohos-sdk-windows_linux-public.tar.gz"
readonly ARCHIVE_SHA256="b833b75a64ee46bbd7880921abbb49b733ec5c8171b6684c9b524d57f624cee0"
readonly ETS_MEMBER="linux/ets-linux-x64-${VERSION}-Release.zip"
readonly ETS_SHA256="f32fc652fe3fc122e166a6b426695394610bd001a76b669396436b8cff6b03ac"
readonly CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}/angularts/openharmony-sdk-${VERSION}"
readonly ETS_ARCHIVE="$CACHE_ROOT/ets-linux-x64-${VERSION}-Release.zip"
readonly SDK_ROOT="$CACHE_ROOT/ets/ets"

if [[ -f "$SDK_ROOT/oh-uni-package.json" ]]; then
  printf 'OpenHarmony ETS SDK %s is available at %s\n' "$VERSION" "$SDK_ROOT"
  exit 0
fi

mkdir -p "$CACHE_ROOT"
temporary="$ETS_ARCHIVE.$$"
trap 'rm -f "$temporary"' EXIT

# The ETS member is first in Huawei's combined Windows/Linux archive. Extracting
# only that member avoids storing or unpacking the 2.3 GiB native SDK. curl 23 is
# expected when tar closes the stream after the requested member.
set +e
set +o pipefail
curl --fail --location --silent --show-error --retry 3 "$ARCHIVE_URL" \
  | tar -xzOf - --occurrence=1 "$ETS_MEMBER" > "$temporary"
statuses=("${PIPESTATUS[@]}")
set -o pipefail
set -e
if [[ "${statuses[1]}" -ne 0 ]] || { [[ "${statuses[0]}" -ne 0 ]] && [[ "${statuses[0]}" -ne 23 ]]; }; then
  printf 'Failed to extract %s from the official OpenHarmony SDK archive\n' "$ETS_MEMBER" >&2
  exit 1
fi

actual_sha256="$(sha256sum "$temporary" | cut -d' ' -f1)"
if [[ "$actual_sha256" != "$ETS_SHA256" ]]; then
  printf 'OpenHarmony ETS SDK checksum mismatch: expected %s, got %s\n' \
    "$ETS_SHA256" "$actual_sha256" >&2
  exit 1
fi

mv "$temporary" "$ETS_ARCHIVE"
mkdir -p "$CACHE_ROOT/ets"
unzip -oq "$ETS_ARCHIVE" -d "$CACHE_ROOT/ets"
test -f "$SDK_ROOT/oh-uni-package.json"

printf 'OpenHarmony ETS SDK %s is available at %s\n' "$VERSION" "$SDK_ROOT"
printf 'Combined archive identity: %s\n' "$ARCHIVE_SHA256"
