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
NAME_MAPPING_FILE="${10:?name mapping file is required}"
if [[ -n "${JSINTEROP_GENERATOR_JAVA:-}" ]]; then
  JAVA_CMD="${JSINTEROP_GENERATOR_JAVA}"
elif [[ -n "${TOOLCHAIN_JAVA_HOME:-}" ]]; then
  JAVA_CMD="${TOOLCHAIN_JAVA_HOME}/bin/java"
else
  JAVA_CMD="java"
fi

if ! command -v "${JAVA_CMD}" >/dev/null 2>&1; then
  echo "Java executable not found: ${JAVA_CMD}" >&2
  echo "Unset JSINTEROP_GENERATOR_JAVA to use Maven's JDK 21 toolchain." >&2
  exit 1
fi
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
  --name_mapping_file "${NAME_MAPPING_FILE}" \
  "${BROWSER_EXTERNS_FILE}" \
  "${JSINTEROP_EXTERNS}"

(
  cd "${OUTPUT_SOURCES_DIR}"
  jar -xf "${OUTPUT_SRCJAR_ABS}"
)

mkdir -p "${OUTPUT_SOURCES_DIR}/META-INF/externs"
{
  cat "${EXTERNS_FILE}"
  cat <<'EOF'

/** @record */
function Keyframe() {}

/** @constructor */
function ElementInternals() {}

/** @type {?} */
ElementInternals.prototype.setFormValue;

/** @type {?} */
HTMLElement.prototype.formStateRestoreCallback;
EOF
} > "${OUTPUT_SOURCES_DIR}/META-INF/externs/angular-ts.externs.js"

"${NODE:-node}" "${SCRIPT_DIR}/normalize-generated-jsinterop-java.mjs" \
  "${OUTPUT_SOURCES_DIR}"

"${NODE:-node}" "${SCRIPT_DIR}/refine-generated-jsinterop-types.mjs" \
  "${OUTPUT_SOURCES_DIR}"

"${NODE:-node}" "${SCRIPT_DIR}/apply-jsinterop-javadocs.mjs" \
  "${EXTERNS_FILE}" \
  "${OUTPUT_SOURCES_DIR}"
