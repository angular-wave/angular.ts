import assert from "node:assert/strict";
import test from "node:test";
import { releaseArtifactRecord } from "./stage-release-artifacts.mjs";

test("records immutable package identity, size, and checksum", () => {
  assert.deepEqual(
    releaseArtifactRecord(
      { module: "core", package: "@angular-wave/core", extension: "har" },
      "1.2.3",
      Buffer.from("artifact"),
    ),
    {
      module: "core",
      package: "@angular-wave/core",
      version: "1.2.3",
      file: "core.har",
      bytes: 8,
      sha256: "c7c5c1d70c5dec4416ab6158afd0b223ef40c29b1dc1f97ed9428b94d4cadb1c",
    },
  );
});
