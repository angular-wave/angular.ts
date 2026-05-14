import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const integrationRoot = resolve(dirname(__filename), "..");
const repoRoot = resolve(integrationRoot, "../..");
const output = resolve(integrationRoot, "demo/compiled.js");

mkdirSync(dirname(output), { recursive: true });

const validation = spawnSync(
  "node",
  [resolve(integrationRoot, "scripts/validate-externs.mjs")],
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);

if (validation.status !== 0) {
  process.exit(validation.status || 1);
}

const args = [
  "--yes",
  "google-closure-compiler",
  "--compilation_level=ADVANCED",
  "--language_in=ECMASCRIPT_2020",
  "--language_out=ECMASCRIPT_2020",
  "--strict_mode_input=true",
  "--emit_use_strict=true",
  "--process_closure_primitives=true",
  "--warning_level=VERBOSE",
  "--jscomp_error=*",
  `--externs=${resolve(integrationRoot, "externs/angular-ts.externs.js")}`,
  `--js=${resolve(integrationRoot, "demo/goog-base.js")}`,
  `--js=${resolve(integrationRoot, "demo/todo.js")}`,
  `--js=${resolve(integrationRoot, "demo/todo-controller.js")}`,
  `--js=${resolve(integrationRoot, "demo/app.js")}`,
  `--js_output_file=${output}`,
];

const result = spawnSync("npx", args, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Closure demo written to ${output}`);
