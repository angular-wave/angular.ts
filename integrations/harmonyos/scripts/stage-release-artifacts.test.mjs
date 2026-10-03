import assert from "node:assert/strict";
import test from "node:test";
import {
  releaseArtifactRecord,
  releaseDependencyManifest,
  releaseProvenance,
  releaseSpdx,
} from "./stage-release-artifacts.mjs";

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

test("generates dependency, SPDX, and SLSA release metadata", () => {
  const records = [
    releaseArtifactRecord(
      { module: "core", package: "@angular-wave/core", extension: "har" },
      "1.2.3",
      Buffer.from("core"),
    ),
    releaseArtifactRecord(
      { module: "navigation", package: "@angular-wave/navigation", extension: "har" },
      "1.2.3",
      Buffer.from("navigation"),
    ),
  ];
  const dependencies = releaseDependencyManifest(records, new Map([
    ["core", { dependencies: {} }],
    ["navigation", { dependencies: { "@angular-wave/core": "1.2.3" } }],
  ]), "1.2.3");
  const context = {
    created: "2026-10-03T00:00:00.000Z",
    commit: "a".repeat(40),
    repository: "https://github.com/angular-wave/angular.ts",
    builder: "https://github.com/angular-wave/angular.ts/actions/runs/42",
    invocationId: "42",
  };
  const spdx = releaseSpdx(records, dependencies, context);
  const provenance = releaseProvenance(records, "1.2.3", context);

  assert.deepEqual(dependencies.packages[1].dependencies, {
    "@angular-wave/core": "1.2.3",
  });
  assert.equal(spdx.spdxVersion, "SPDX-2.3");
  assert.equal(spdx.packages.length, 2);
  assert.ok(spdx.relationships.some((relationship) =>
    relationship.relationshipType === "DEPENDS_ON"
      && relationship.spdxElementId === "SPDXRef-Package-navigation"
      && relationship.relatedSpdxElement === "SPDXRef-Package-core"
  ));
  assert.equal(provenance.predicateType, "https://slsa.dev/provenance/v1");
  assert.deepEqual(provenance.subject.map((subject) => subject.name), [
    "core.har",
    "navigation.har",
  ]);
  assert.deepEqual(
    provenance.predicate.buildDefinition.resolvedDependencies[0].digest,
    { gitCommit: "a".repeat(40) },
  );
});

test("keeps local provenance honest when no source identity exists", () => {
  const record = releaseArtifactRecord(
    { module: "core", package: "@angular-wave/core", extension: "har" },
    "1.2.3",
    Buffer.from("core"),
  );
  assert.deepEqual(
    releaseProvenance([record], "1.2.3", {
      builder: "local",
      invocationId: "local",
    }).predicate.buildDefinition.resolvedDependencies,
    [],
  );
});
