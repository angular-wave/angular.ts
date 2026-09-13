import assert from "node:assert/strict";
import test from "node:test";

import {
  selectPhysicalEvidenceArtifact,
  selectSuccessfulPhysicalRun,
  verifyPhysicalReleaseEvidence,
} from "./verify-physical-release-evidence.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";

const successfulRun = {
  conclusion: "success",
  event: "workflow_dispatch",
  head_sha: sha,
  html_url: "https://github.com/angular-wave/angular.ts/actions/runs/42",
  id: 42,
  path: ".github/workflows/android-physical.yml",
  status: "completed",
};

const evidenceArtifact = {
  expired: false,
  name: "android-native-physical-reference-device-42",
  size_in_bytes: 4096,
};

test("selects an exact successful manually dispatched run", () => {
  const run = selectSuccessfulPhysicalRun(
    {
      workflow_runs: [
        { ...successfulRun, path: ".github/workflows/ci.yml" },
        { ...successfulRun, head_sha: "f".repeat(40) },
        { ...successfulRun, conclusion: "failure" },
        successfulRun,
      ],
    },
    sha,
  );
  assert.equal(run.id, 42);
});

test("rejects missing physical validation for the release commit", () => {
  assert.throws(
    () => selectSuccessfulPhysicalRun({ workflow_runs: [] }, sha),
    /No successful Android Physical Device workflow run/u,
  );
});

test("selects only non-empty, unexpired physical evidence", () => {
  const artifact = selectPhysicalEvidenceArtifact({
    artifacts: [
      { ...evidenceArtifact, expired: true },
      { ...evidenceArtifact, size_in_bytes: 0 },
      evidenceArtifact,
    ],
  });
  assert.equal(artifact.name, evidenceArtifact.name);
});

test("rejects a successful run without retained evidence", () => {
  assert.throws(
    () =>
      selectPhysicalEvidenceArtifact({
        artifacts: [{ ...evidenceArtifact, expired: true }],
      }),
    /no non-empty, unexpired evidence artifact/u,
  );
});

test("verifies the run and artifact through the GitHub API", async () => {
  const requested = [];
  const result = await verifyPhysicalReleaseEvidence({
    apiUrl: "https://api.example.test",
    repository: "angular-wave/angular.ts",
    request: async (url, token) => {
      requested.push(url.toString());
      assert.equal(token, "token");
      return requested.length === 1
        ? { workflow_runs: [successfulRun] }
        : { artifacts: [evidenceArtifact] };
    },
    sha,
    token: "token",
  });

  assert.equal(result.run.id, 42);
  assert.equal(result.artifact.name, evidenceArtifact.name);
  assert.match(
    requested[0],
    /^https:\/\/api\.example\.test\/repos\/angular-wave\/angular\.ts\/actions\/runs\?/u,
  );
  assert.match(requested[0], /head_sha=0123456789abcdef/u);
  assert.equal(
    requested[1],
    "https://api.example.test/repos/angular-wave/angular.ts/actions/runs/42/artifacts?per_page=100",
  );
});

test("rejects malformed GitHub responses", () => {
  assert.throws(
    () => selectSuccessfulPhysicalRun({}, sha),
    /workflow_runs is not an array/u,
  );
  assert.throws(
    () => selectPhysicalEvidenceArtifact({}),
    /artifacts is not an array/u,
  );
});
