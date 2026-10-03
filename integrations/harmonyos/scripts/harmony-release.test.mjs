import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  classifyPackageLookup,
  orderArtifacts,
  parseSkippedPackages,
  publishArtifacts,
  verifyArtifactRecord,
  verifyArtifactBundle,
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

test("requires checksummed license, dependency, SPDX, and provenance metadata", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "harmony-release-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const artifact = {
    module: "core",
    package: "@angular-wave/core",
    extension: "har",
  };
  const content = Buffer.from("artifact");
  const sha256 = createHash("sha256").update(content).digest("hex");
  const record = {
    module: "core",
    package: "@angular-wave/core",
    version: "1.2.3",
    file: "core.har",
    bytes: content.byteLength,
    sha256,
  };
  const files = new Map([
    ["core.har", content],
    ["LICENSE", Buffer.from("MIT License\n")],
    ["dependencies.json", Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      version: "1.2.3",
      packages: [{
        module: "core",
        package: "@angular-wave/core",
        version: "1.2.3",
        file: "core.har",
        dependencies: {},
      }],
    })}\n`)],
    ["sbom.spdx.json", Buffer.from(`${JSON.stringify({
      spdxVersion: "SPDX-2.3",
      packages: [{
        name: "@angular-wave/core",
        versionInfo: "1.2.3",
        checksums: [{ algorithm: "SHA256", checksumValue: sha256 }],
      }],
    })}\n`)],
    ["provenance.intoto.json", Buffer.from(`${JSON.stringify({
      _type: "https://in-toto.io/Statement/v1",
      predicateType: "https://slsa.dev/provenance/v1",
      subject: [{ name: "core.har", digest: { sha256 } }],
    })}\n`)],
  ]);
  files.set("manifest.json", Buffer.from(`${JSON.stringify({
    version: "1.2.3",
    artifacts: [record],
    metadata: [
      "LICENSE",
      "dependencies.json",
      "provenance.intoto.json",
      "sbom.spdx.json",
    ],
  })}\n`));
  for (const [name, value] of files) await writeFile(resolve(directory, name), value);
  await writeFile(resolve(directory, "SHA256SUMS"), [...files]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${createHash("sha256").update(value).digest("hex")}  ${name}\n`)
    .join(""));

  await assert.doesNotReject(verifyArtifactBundle({
    artifacts: [artifact],
    version: "1.2.3",
    directory,
  }));
  await writeFile(resolve(directory, "sbom.spdx.json"), "{}\n");
  await assert.rejects(
    verifyArtifactBundle({ artifacts: [artifact], version: "1.2.3", directory }),
    /SHA256SUMS lacks sbom\.spdx\.json/u,
  );
});
