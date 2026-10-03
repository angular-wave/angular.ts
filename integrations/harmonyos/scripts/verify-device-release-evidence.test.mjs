import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  selectHarmonyEvidence,
  selectHarmonyRun,
  verifyChecksums,
  verifyEvidenceDirectory,
  verifyHarmonyEvidence,
} from "./verify-device-release-evidence.mjs";
import { captureReleaseEvidence } from "./capture-release-evidence.mjs";
import {
  releaseArtifactRecord,
  releaseDependencyManifest,
  releaseProvenance,
  releaseSpdx,
} from "./stage-release-artifacts.mjs";
import {
  requiredNativeCapabilities,
  requiredNativeElements,
} from "./validate-device-results.mjs";

const sha = "a".repeat(40);
const integrationRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const run = {
  id: 7,
  head_sha: sha,
  path: ".github/workflows/harmonyos.yml",
  event: "workflow_dispatch",
  status: "completed",
  conclusion: "success",
};
const artifact = {
  id: 9,
  name: "harmonyos-native-evidence-phone",
  expired: false,
  size_in_bytes: 12,
};

test("selects exact manually dispatched HarmonyOS evidence", () => {
  assert.equal(selectHarmonyRun({ workflow_runs: [run] }, sha).id, 7);
  assert.equal(selectHarmonyEvidence({ artifacts: [artifact] }).id, 9);
});

test("rejects stale, automatic, ambiguous, and empty evidence", () => {
  assert.throws(() => selectHarmonyRun({ workflow_runs: [{ ...run, conclusion: "failure" }] }, sha));
  assert.throws(() => selectHarmonyRun({ workflow_runs: [{ ...run, event: "push" }] }, sha));
  assert.throws(() => selectHarmonyEvidence({ artifacts: [{ ...artifact, size_in_bytes: 0 }] }));
  assert.throws(() => selectHarmonyEvidence({ artifacts: [artifact, { ...artifact, id: 10 }] }));
});

test("detects missing and modified evidence files", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "harmony-sums-"));
  try {
    await writeFile(resolve(directory, "result.json"), "original");
    const checksum = createHash("sha256").update("original").digest("hex");
    await writeFile(resolve(directory, "SHA256SUMS"), `${checksum}  result.json\n`);
    await verifyChecksums(directory);
    await writeFile(resolve(directory, "result.json"), "modified");
    await assert.rejects(verifyChecksums(directory), /was modified/u);
    await writeFile(resolve(directory, "extra.txt"), "unlisted");
    await assert.rejects(verifyChecksums(directory), /incomplete/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("verifies complete device evidence and the exact release HARs", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "harmony-complete-evidence-"));
  try {
    const source = resolve(temporary, "device");
    const release = resolve(temporary, "release");
    const output = resolve(temporary, "evidence");
    await mkdir(source);
    await mkdir(release);
    for (const file of ["junit.xml", "accessibility.json", "performance.json", "phone.png", "tablet.png"]) {
      await writeFile(resolve(source, file), "evidence");
    }
    await writeFile(resolve(source, "results.json"), JSON.stringify({
      schemaVersion: 2,
      platform: "harmonyos",
      commit: sha,
      device: {
        name: "phone",
        model: "HarmonyOS reference phone",
        osVersion: "6.0",
        apiLevel: 26,
        architecture: "arm64",
        formFactor: "phone",
        environment: "cloud",
      },
      tests: { passed: 61, failed: 0, skipped: 0 },
      contracts: {
        nativeElements: { passed: requiredNativeElements, failed: [] },
        capabilities: { passed: requiredNativeCapabilities, failed: [] },
      },
      accessibility: { violations: 0 },
      performance: { failures: 0 },
      artifacts: {
        junit: "junit.xml",
        accessibility: "accessibility.json",
        performance: "performance.json",
        screenshots: { phone: "phone.png", tablet: "tablet.png" },
      },
    }));
    const repository = JSON.parse(
      await readFile(resolve(integrationRoot, "../../package.json"), "utf8"),
    );
    const artifacts = JSON.parse(
      await readFile(resolve(integrationRoot, "harmony-artifacts.json"), "utf8"),
    );
    const records = [];
    const packages = new Map();
    for (const publication of artifacts) {
      const content = Buffer.from(`HAR:${publication.module}`);
      await writeFile(resolve(release, `${publication.module}.har`), content);
      records.push(releaseArtifactRecord(publication, repository.version, content));
      packages.set(publication.module, JSON.parse(await readFile(
        resolve(integrationRoot, "packages", publication.module, "oh-package.json5"),
        "utf8",
      )));
    }
    const dependencies = releaseDependencyManifest(records, packages, repository.version);
    const releaseContext = {
      created: "2026-10-03T00:00:00.000Z",
      commit: sha,
      repository: "https://github.com/angular-wave/angular.ts",
      builder: `https://github.com/angular-wave/angular.ts/actions/runs/${run.id}`,
      invocationId: String(run.id),
    };
    await writeFile(resolve(release, "manifest.json"), JSON.stringify({
      version: repository.version,
      artifacts: records,
      metadata: [
        "LICENSE",
        "dependencies.json",
        "provenance.intoto.json",
        "sbom.spdx.json",
      ],
    }));
    await writeFile(
      resolve(release, "LICENSE"),
      await readFile(resolve(integrationRoot, "../../LICENSE")),
    );
    await writeFile(
      resolve(release, "dependencies.json"),
      JSON.stringify(dependencies),
    );
    await writeFile(
      resolve(release, "sbom.spdx.json"),
      JSON.stringify(releaseSpdx(records, dependencies, releaseContext)),
    );
    await writeFile(
      resolve(release, "provenance.intoto.json"),
      JSON.stringify(releaseProvenance(records, repository.version, releaseContext)),
    );
    const releaseFiles = [
      ...records.map(({ file }) => file),
      "LICENSE",
      "dependencies.json",
      "manifest.json",
      "provenance.intoto.json",
      "sbom.spdx.json",
    ].sort();
    await writeFile(resolve(release, "SHA256SUMS"), (await Promise.all(
      releaseFiles.map(async (file) => {
        const content = await readFile(resolve(release, file));
        return `${createHash("sha256").update(content).digest("hex")}  ${file}\n`;
      }),
    )).join(""));
    await captureReleaseEvidence({
      source,
      release,
      output,
      commit: sha,
      runId: String(run.id),
      deviceName: "phone",
      commandLineToolsSha256: "b".repeat(64),
      versions: { ohpm: "5.3.2", hvigor: "6.20.0", codelinter: "1.0.0" },
    });
    const verified = await verifyEvidenceDirectory({ directory: output, sha, run, artifact });
    assert.equal(verified.results.tests.passed, 61);
    assert.equal(verified.metadata.version, repository.version);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("downloads and delegates validation of the retained artifact", async () => {
  const responses = [{ workflow_runs: [run] }, { artifacts: [artifact] }];
  let extracted = false;
  await assert.rejects(verifyHarmonyEvidence({
    repository: "angular-wave/angular.ts",
    sha,
    token: "test",
    request: async () => responses.shift(),
    download: async (url) => {
      assert.match(String(url), /artifacts\/9\/zip$/u);
      return Buffer.from("archive");
    },
    extract: async (_archive, directory) => {
      extracted = true;
      await mkdir(directory);
      await writeFile(resolve(directory, "SHA256SUMS"), "");
    },
  }), /checksum manifest is incomplete|ENOENT/u);
  assert.equal(extracted, true);
});
