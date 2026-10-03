import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const integration = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workflow = await readFile(resolve(integration, "../../.github/workflows/harmonyos.yml"), "utf8");
const releaseWorkflow = await readFile(
  resolve(integration, "../../.github/workflows/release.yml"),
  "utf8",
);

test("audits and builds automatically with the pinned public OpenHarmony SDK", () => {
  assert.match(workflow, /pull_request:/u);
  assert.match(workflow, /push:/u);
  assert.match(workflow, /compatibility-audit:/u);
  assert.match(workflow, /openharmony-sdk-6\.1\.0\.31/u);
  assert.match(workflow, /make -C integrations\/harmonyos openharmony-audit/u);
  assert.match(workflow, /make -C integrations\/harmonyos openharmony-build/u);
  assert.match(workflow, /name: openharmony-api23-\$\{\{ github\.sha \}\}/u);
  assert.match(workflow, /path: integrations\/harmonyos\/build\/openharmony-api23/u);
  assert.match(workflow, /official-toolchain:\n    if: github\.event_name == 'workflow_dispatch'/u);
});

test("uses an ephemeral hosted runner and a verified official tool archive", () => {
  assert.match(workflow, /runs-on: ubuntu-latest/u);
  assert.doesNotMatch(workflow, /runs-on:.*self-hosted/u);
  assert.match(workflow, /HARMONY_COMMAND_LINE_TOOLS_URL/u);
  assert.match(workflow, /HARMONY_COMMAND_LINE_TOOLS_SHA256/u);
  assert.match(workflow, /make -C integrations\/harmonyos bootstrap/u);
});

test("requires native release checks and external device evidence", () => {
  assert.match(workflow, /make -C integrations\/harmonyos release-check/u);
  assert.match(workflow, /stage-release-artifacts\.mjs/u);
  assert.match(workflow, /capture-release-evidence\.mjs/u);
  assert.match(
    workflow,
    /HARMONY_RELEASE_ARTIFACT_DIR: \$\{\{ runner\.temp \}\}\/harmonyos-release/u,
  );
  assert.match(workflow, /harmonyos-hars-/u);
  assert.match(workflow, /HARMONY_DEVICE_TEST_COMMAND/u);
  assert.match(workflow, /validate-device-results\.mjs/u);
  assert.match(workflow, /harmonyos-native-evidence/u);
  assert.match(workflow, /actions\/upload-artifact@/u);
  assert.ok(
    workflow.indexOf("Retain exact HarmonyOS release packages") >
      workflow.indexOf("Capture immutable evidence"),
  );
});

test("verifies approved packages on a bootstrapped hosted runner", () => {
  const job = releaseWorkflow.slice(releaseWorkflow.indexOf("  validate-harmony:"));
  assert.match(job, /runs-on: ubuntu-latest/u);
  assert.doesNotMatch(job, /runs-on:.*self-hosted/u);
  assert.match(job, /HARMONY_COMMAND_LINE_TOOLS_URL/u);
  assert.match(job, /HARMONY_COMMAND_LINE_TOOLS_SHA256/u);
  assert.match(job, /make -C integrations\/harmonyos bootstrap/u);
  assert.match(job, /make -C integrations\/harmonyos verify-published/u);
});
