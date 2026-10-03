#!/usr/bin/env bash

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
install_root="${HARMONY_COMMAND_LINE_TOOLS_INSTALL_ROOT:-$root/.tools}"
target="$install_root/command-line-tools"
archive="${HARMONY_COMMAND_LINE_TOOLS_ARCHIVE:-}"
archive_url="${HARMONY_COMMAND_LINE_TOOLS_URL:-}"
checksum="${HARMONY_COMMAND_LINE_TOOLS_SHA256:-}"

if [[ -x "$target/bin/ohpm" && -x "$target/bin/hvigorw" && -x "$target/bin/codelinter" ]]; then
  HARMONY_COMMAND_LINE_TOOLS_HOME="$target" node "$root/scripts/check-toolchain.mjs"
  exit 0
fi

if [[ -z "$archive" && -n "$archive_url" ]]; then
  archive="$install_root/downloads/command-line-tools.zip"
  mkdir -p "$(dirname "$archive")"
  curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
    "$archive_url" --output "$archive"
fi

if [[ -z "$archive" || -z "$checksum" ]]; then
  cat >&2 <<'EOF'
HarmonyOS command-line tools are not installed.

Download the official Linux Command Line Tools archive from Huawei's download
center, then provide HARMONY_COMMAND_LINE_TOOLS_ARCHIVE (or an authenticated
HARMONY_COMMAND_LINE_TOOLS_URL) and HARMONY_COMMAND_LINE_TOOLS_SHA256. The
archive includes the matching SDK, ohpm, Hvigor, and Code Linter.
EOF
  exit 1
fi

[[ -f "$archive" ]] || { echo "Archive does not exist: $archive" >&2; exit 1; }
actual_checksum="$(sha256sum "$archive" | cut -d ' ' -f 1)"
[[ "$actual_checksum" == "$checksum" ]] || {
  echo "HarmonyOS archive checksum does not match." >&2
  echo "Expected: $checksum" >&2
  echo "Actual:   $actual_checksum" >&2
  exit 1
}

temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
case "$archive" in
  *.zip) unzip -q "$archive" -d "$temporary" ;;
  *.tar.gz|*.tgz) tar -xzf "$archive" -C "$temporary" ;;
  *.tar.xz) tar -xJf "$archive" -C "$temporary" ;;
  *) echo "Unsupported archive: $archive" >&2; exit 1 ;;
esac

ohpm="$(find "$temporary" -type f -name ohpm -print -quit)"
[[ -n "$ohpm" ]] || { echo "Archive does not contain bin/ohpm." >&2; exit 1; }
source_root="$(dirname "$(dirname "$ohpm")")"
mkdir -p "$install_root"
rm -rf "$target"
mv "$source_root" "$target"
chmod +x "$target/bin/ohpm" "$target/bin/hvigorw" "$target/bin/codelinter"
HARMONY_COMMAND_LINE_TOOLS_HOME="$target" node "$root/scripts/check-toolchain.mjs"
