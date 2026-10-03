import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPackageLookup,
  orderArtifacts,
  parseSkippedPackages,
  publishArtifacts,
  verifyArtifactRecord,
  verifyArtifacts,
} from "./harmony-release.mjs";

const artifacts = [
  { module: "navigation", package: "navigation" },
  { module: "native-elements-compiler", package: "compiler" },
  { module: "core", package: "core" },
  { module: "browser", package: "browser" },
];

test("orders dependency-free packages before core consumers", () => {
  assert.deepEqual(
    orderArtifacts(artifacts).map(({ module }) => module),
    ["core", "native-elements-compiler", "browser", "navigation"],
  );
});

test("parses module and package recovery skips", () => {
  assert.deepEqual([...parseSkippedPackages(" core, @scope/browser, ,")], [
    "core",
    "@scope/browser",
  ]);
});

test("classifies registry responses without hiding infrastructure errors", () => {
  assert.equal(classifyPackageLookup({ code: 0, stdout: "{}", stderr: "" }), "published");
  assert.equal(
    classifyPackageLookup({ code: 1, stdout: "", stderr: "404 not found" }),
    "missing",
  );
  assert.throws(() =>
    classifyPackageLookup({ code: 1, stdout: "", stderr: "connection reset" }),
  );
});

test("publishes only missing packages and supports partial-release recovery", async () => {
  const published = [];
  const submitted = await publishArtifacts({
    artifacts,
    version: "1.2.3",
    skipped: new Set(["compiler"]),
    lookup: async ({ module }) => (module === "core" ? "published" : "missing"),
    locate: async ({ module }) => `/${module}.har`,
    publish: async (path) => published.push(path),
  });
  assert.deepEqual(published, ["/browser.har", "/navigation.har"]);
  assert.deepEqual(submitted, ["browser", "navigation"]);
});

test("stops at the first rejected package", async () => {
  const attempted = [];
  await assert.rejects(
    publishArtifacts({
      artifacts,
      version: "1.2.3",
      lookup: async () => "missing",
      locate: async ({ module }) => `/${module}.har`,
      publish: async (_path, { module }) => {
        attempted.push(module);
        if (module === "native-elements-compiler") throw new Error("rejected");
      },
    }),
  );
  assert.deepEqual(attempted, ["core", "native-elements-compiler"]);
});

test("requires every package version to be publicly visible", async () => {
  await assert.rejects(
    verifyArtifacts({
      artifacts,
      version: "1.2.3",
      lookup: async ({ module }) => (module === "navigation" ? "missing" : "published"),
    }),
    /navigation/u,
  );
});

test("verifies exact retained HAR identity and content", () => {
  const artifact = { module: "core", package: "core", extension: "har" };
  const content = Buffer.from("artifact");
  const record = {
    module: "core",
    package: "core",
    version: "1.2.3",
    file: "core.har",
    bytes: 8,
    sha256: "c7c5c1d70c5dec4416ab6158afd0b223ef40c29b1dc1f97ed9428b94d4cadb1c",
  };
  assert.doesNotThrow(() => verifyArtifactRecord(artifact, "1.2.3", record, content));
  for (const stale of [
    { ...record, package: "wrong" },
    { ...record, version: "1.2.4" },
    { ...record, file: "wrong.har" },
    { ...record, bytes: 7 },
    { ...record, sha256: "0".repeat(64) },
  ]) {
    assert.throws(() => verifyArtifactRecord(artifact, "1.2.3", stale, content));
  }
});
