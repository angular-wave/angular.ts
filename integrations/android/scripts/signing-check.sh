#!/usr/bin/env bash

set -euo pipefail

android_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
key_home="$(mktemp -d)"

cleanup() {
  node -e 'require("node:fs").rmSync(process.argv[1], { force: true, recursive: true })' "$key_home"
}
trap cleanup EXIT

chmod 700 "$key_home"
gpg \
  --batch \
  --homedir "$key_home" \
  --passphrase '' \
  --quick-generate-key \
  'Angular Native Build Test <build-test@angular.invalid>' \
  ed25519 \
  sign \
  1d >/dev/null 2>&1

signing_key="$(gpg --batch --homedir "$key_home" --armor --export-secret-keys)"
mapfile -t modules < <(node "$android_root/scripts/android-artifacts.mjs" module)
tasks=()
for module in "${modules[@]}"; do
  find "$android_root/$module/build" -type f -name '*.asc' -delete
  tasks+=("${module}:signMavenPublication")
done

ORG_GRADLE_PROJECT_signingInMemoryKey="$signing_key" \
  "$android_root/gradlew" \
  -p "$android_root" \
  "${tasks[@]}" \
  --no-configuration-cache

for module in "${modules[@]}"; do
  signatures=()
  while IFS= read -r signature; do
    signatures+=("$signature")
  done < <(find "$android_root/$module/build" -type f -name '*.asc' -print)

  if ((${#signatures[@]} < 4)); then
    echo "$module generated only ${#signatures[@]} signatures" >&2
    exit 1
  fi

  for signature in "${signatures[@]}"; do
    gpg \
      --batch \
      --homedir "$key_home" \
      --verify "$signature" "${signature%.asc}" >/dev/null 2>&1
  done
done

printf 'Validated in-memory signing for %s Android publications.\n' "${#modules[@]}"
