#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?jsinterop-generator release version is required}"
OUT_JAR="${2:?output jar path is required}"
REQUESTED_VERSION="${VERSION}"
mkdir -p "$(dirname "${OUT_JAR}")"
OUT_JAR="$(cd "$(dirname "${OUT_JAR}")" && pwd)/$(basename "${OUT_JAR}")"
VERSION_MARKER="${OUT_JAR}.version"

if [[ "${VERSION}" == "latest" ]]; then
  VERSION="$(
    curl -fsSL https://api.github.com/repos/google/jsinterop-generator/releases/latest \
      | node -e 'let input = ""; process.stdin.on("data", (chunk) => input += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(input).tag_name));'
  )"
fi

if [[ -n "${JSINTEROP_GENERATOR_JAR:-}" ]]; then
  if [[ ! -f "${JSINTEROP_GENERATOR_JAR}" ]]; then
    echo "JSINTEROP_GENERATOR_JAR does not exist: ${JSINTEROP_GENERATOR_JAR}" >&2
    exit 1
  fi

  rm -f "${OUT_JAR}"
  cp "${JSINTEROP_GENERATOR_JAR}" "${OUT_JAR}"
  echo "${VERSION}" > "${VERSION_MARKER}"
  exit 0
fi

if [[ -f "${OUT_JAR}" && -f "${VERSION_MARKER}" && "$(cat "${VERSION_MARKER}")" == "${VERSION}" ]]; then
  exit 0
fi

if [[ -f "${OUT_JAR}" && "${REQUESTED_VERSION}" != "latest" && ! -f "${VERSION_MARKER}" ]]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORK_DIR="${PROJECT_DIR}/target/tools/jsinterop-generator-src"
ARCHIVE="${PROJECT_DIR}/target/tools/jsinterop-generator-${VERSION}.tar.gz"
SOURCE_DIR="${WORK_DIR}/jsinterop-generator-${VERSION#v}"

mkdir -p "${WORK_DIR}" "$(dirname "${ARCHIVE}")"

if [[ ! -f "${ARCHIVE}" ]]; then
  curl -L \
    "https://github.com/google/jsinterop-generator/releases/download/${VERSION}/jsinterop-generator-${VERSION}.tar.gz" \
    -o "${ARCHIVE}"
fi

rm -rf "${SOURCE_DIR}"
tar -xzf "${ARCHIVE}" -C "${WORK_DIR}"

if command -v bazelisk >/dev/null 2>&1; then
  BAZEL_CMD=(bazelisk)
elif command -v bazel >/dev/null 2>&1; then
  BAZEL_CMD=(bazel)
elif command -v npx >/dev/null 2>&1; then
  BAZEL_CMD=(npx --yes @bazel/bazelisk)
else
  echo "Unable to build jsinterop-generator: install bazel, bazelisk, or npx." >&2
  echo "Alternatively set JSINTEROP_GENERATOR_JAR=/path/to/ClosureJsinteropGenerator_deploy.jar." >&2
  exit 1
fi

(
  cd "${SOURCE_DIR}"
  "${BAZEL_CMD[@]}" build //java/jsinterop/generator/closure:ClosureJsinteropGenerator_deploy.jar
)

rm -f "${OUT_JAR}"
cp \
  "${SOURCE_DIR}/bazel-bin/java/jsinterop/generator/closure/ClosureJsinteropGenerator_deploy.jar" \
  "${OUT_JAR}"
echo "${VERSION}" > "${VERSION_MARKER}"
