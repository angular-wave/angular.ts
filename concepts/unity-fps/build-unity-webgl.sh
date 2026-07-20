#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
UNITY="${UNITY:-$HOME/Unity/Hub/Editor/6000.0.77f1/Editor/Unity}"
PROJECT="$ROOT_DIR/concepts/unity-fps/unity-project"
LOG_FILE="${TMPDIR:-/tmp}/angular-ts-unity-fps-build.log"

"$UNITY" \
  -batchmode \
  -quit \
  -projectPath "$PROJECT" \
  -executeMethod AngularTsConcept.Editor.UnityFpsBuild.Build \
  -logFile "$LOG_FILE"

printf '%s\n' "Unity WebGL build complete. Log: $LOG_FILE"
