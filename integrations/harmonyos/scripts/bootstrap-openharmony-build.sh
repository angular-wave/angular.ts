#!/usr/bin/env bash

set -euo pipefail

readonly cache_root="${XDG_CACHE_HOME:-$HOME/.cache}/angularts"
readonly hvigor_root="${OPENHARMONY_BUILD_HVIGOR_HOME:-$cache_root/hvigor-6.0.0.868/extracted-v1}"
readonly sdk_root="${OPENHARMONY_BUILD_SDK_HOME:-$cache_root/openharmony-sdk-hvigor-6.1.0.31}"
readonly hvigor_url="https://repo.huaweicloud.com/harmonyos/compiler/hvigor/6.0.0.868/command-line-tools.tar"
readonly hvigor_sha256="e07248a8e314f2d9ff3b606ab29748eb936bd69691b1b3715569802864ceef7a"
readonly sdk_url="https://repo.huaweicloud.com/openharmony/os/6.1-Release/ohos-sdk-windows_linux-public.tar.gz"
readonly sdk_sha256="b833b75a64ee46bbd7880921abbb49b733ec5c8171b6684c9b524d57f624cee0"

temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT

download_verified() {
  local url="$1" checksum="$2" destination="$3"
  curl --fail --location --retry 3 --proto '=https' --tlsv1.2 "$url" --output "$destination"
  printf '%s  %s\n' "$checksum" "$destination" | sha256sum --check --status
}

if [[ ! -x "$hvigor_root/bin/hvigorw" || ! -x "$hvigor_root/ohpm/bin/ohpm" ]]; then
  download_verified "$hvigor_url" "$hvigor_sha256" "$temporary/hvigor.tar"
  mkdir -p "$hvigor_root"
  tar -xf "$temporary/hvigor.tar" -C "$hvigor_root"
  chmod +x "$hvigor_root/bin/hvigorw" "$hvigor_root/ohpm/bin/ohpm"
fi

components=(ets js native previewer toolchains)
sdk_complete=true
for component in "${components[@]}"; do
  if [[ ! -f "$sdk_root/23/$component/oh-uni-package.json" ]]; then
    sdk_complete=false
  fi
done

if [[ "$sdk_complete" != true ]]; then
  download_verified "$sdk_url" "$sdk_sha256" "$temporary/sdk.tar.gz"
  members=()
  for component in "${components[@]}"; do
    members+=("linux/$component-linux-x64-6.1.0.31-Release.zip")
  done
  tar -xzf "$temporary/sdk.tar.gz" -C "$temporary" "${members[@]}"
  mkdir -p "$sdk_root/23"
  for component in "${components[@]}"; do
    unzip -oq "$temporary/linux/$component-linux-x64-6.1.0.31-Release.zip" -d "$sdk_root/23"
  done
fi

printf 'OpenHarmony API 23 build tools are available at %s and %s\n' "$hvigor_root" "$sdk_root"
