#!/usr/bin/env bash
set -euo pipefail

GENERATOR_JAR="${1:?generator jar path is required}"
BROWSER_EXTERNS_FILE="${2:?browser externs file path is required}"
EXTERNS_FILE="${3:?externs file path is required}"
OUTPUT_SRCJAR="${4:?output source jar path is required}"
OUTPUT_DEPFILE="${5:?output dependency file path is required}"
PACKAGE_PREFIX="${6:?package prefix is required}"
EXTENSION_TYPE_PREFIX="${7:?extension type prefix is required}"
GLOBAL_SCOPE_CLASS_NAME="${8:?global scope class name is required}"
OUTPUT_SOURCES_DIR="${9:?output sources directory is required}"
JAVA_CMD="${JSINTEROP_GENERATOR_JAVA:-java}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSINTEROP_EXTERNS="${OUTPUT_SRCJAR%.jar}.externs.js"

if [[ ! -f "${GENERATOR_JAR}" ]]; then
  echo "Generator jar does not exist: ${GENERATOR_JAR}" >&2
  exit 1
fi

if [[ ! -f "${EXTERNS_FILE}" ]]; then
  echo "Externs file does not exist: ${EXTERNS_FILE}" >&2
  exit 1
fi

if [[ ! -f "${BROWSER_EXTERNS_FILE}" ]]; then
  echo "Browser externs file does not exist: ${BROWSER_EXTERNS_FILE}" >&2
  exit 1
fi

rm -rf "${OUTPUT_SOURCES_DIR}"
mkdir -p \
  "$(dirname "${OUTPUT_SRCJAR}")" \
  "$(dirname "${OUTPUT_DEPFILE}")" \
  "${OUTPUT_SOURCES_DIR}"
OUTPUT_SRCJAR_ABS="$(cd "$(dirname "${OUTPUT_SRCJAR}")" && pwd)/$(basename "${OUTPUT_SRCJAR}")"

"${NODE:-node}" "${SCRIPT_DIR}/generate-jsinterop-externs.mjs" \
  "${EXTERNS_FILE}" \
  "${JSINTEROP_EXTERNS}"

"${JAVA_CMD}" -jar "${GENERATOR_JAR}" \
  --output "${OUTPUT_SRCJAR}" \
  --output_dependency_file "${OUTPUT_DEPFILE}" \
  --package_prefix "${PACKAGE_PREFIX}" \
  --extension_type_prefix "${EXTENSION_TYPE_PREFIX}" \
  --global_scope_class_name "${GLOBAL_SCOPE_CLASS_NAME}" \
  "${BROWSER_EXTERNS_FILE}" \
  "${JSINTEROP_EXTERNS}"

(
  cd "${OUTPUT_SOURCES_DIR}"
  jar -xf "${OUTPUT_SRCJAR_ABS}"
)

"${NODE:-node}" "${SCRIPT_DIR}/normalize-generated-jsinterop-java.mjs" \
  "${OUTPUT_SOURCES_DIR}"
