import assert from "node:assert/strict";
import test from "node:test";
import { classifyOpenHarmonyAudit } from "./openharmony-audit-output.mjs";

test("keeps repository errors fatal", () => {
  const audit = classifyOpenHarmonyAudit([
    "ArkTS:ERROR File: /tmp/project/file.ets:4:2",
    " Invalid type",
    "",
    "OpenHarmony API 23 checked 1 ArkTS sources: 1 errors, 0 warnings.",
  ].join("\n"));
  assert.equal(audit.completed, true);
  assert.equal(audit.repositoryErrors, 1);
  assert.equal(audit.sdkErrors, 0);
  assert.match(audit.filtered, /Invalid type/u);
});

test("reports and filters official SDK declaration errors", () => {
  const audit = classifyOpenHarmonyAudit([
    "ArkTS:ERROR File: /cache/ets/ets/api/@ohos.annotation.d.ets:31:1",
    " Declaration expected",
    "",
    "OpenHarmony API 23 checked 1 ArkTS sources: 1 errors, 0 warnings.",
  ].join("\n"));
  assert.equal(audit.completed, true);
  assert.equal(audit.repositoryErrors, 0);
  assert.equal(audit.sdkErrors, 1);
  assert.doesNotMatch(audit.filtered, /Declaration expected/u);
  assert.match(audit.filtered, /1 SDK declaration errors ignored/u);
});

test("does not classify incomplete checker output as a completed audit", () => {
  const audit = classifyOpenHarmonyAudit("checker crashed");
  assert.equal(audit.completed, false);
  assert.equal(audit.repositoryErrors, 0);
  assert.equal(audit.sdkErrors, 0);
});

test("rejects warnings outside the reviewed budget", () => {
  const audit = classifyOpenHarmonyAudit([
    "ArkTS:WARN File: /tmp/project/file.ets:4:2",
    " New compiler warning",
    "",
    "OpenHarmony API 23 checked 1 ArkTS sources: 0 errors, 1 warnings.",
  ].join("\n"));
  assert.equal(audit.warnings, 1);
  assert.deepEqual(audit.unexpectedWarnings, ["New compiler warning: 1 exceeds 0"]);
});

test("allows reductions within a reviewed warning category", () => {
  const audit = classifyOpenHarmonyAudit([
    "ArkTS:WARN File: /tmp/project/file.ets:4:2",
    " Function may throw exceptions. Special handling is required.",
    "",
    "OpenHarmony API 23 checked 1 ArkTS sources: 0 errors, 1 warnings.",
  ].join("\n"));
  assert.equal(audit.warnings, 1);
  assert.deepEqual(audit.unexpectedWarnings, []);
});
