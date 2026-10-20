import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  requiredNativeCapabilities,
  requiredNativeElements,
  requiredResourceCounters,
  validateDeviceResults,
} from "./validate-device-results.mjs";
import { performanceReportFixture } from "./performance-results.fixture.mjs";

const commit = "a".repeat(40);

function result() {
  return {
    schemaVersion: 2,
    platform: "harmonyos",
    commit,
    device: {
      name: "reference",
      model: "Harmony Cloud Phone",
      osVersion: "6.0",
      apiLevel: 26,
      architecture: "arm64",
      formFactor: "phone",
      environment: "cloud",
    },
    tests: { passed: 61, failed: 0, skipped: 0 },
    contracts: {
      nativeElements: { passed: [...requiredNativeElements], failed: [] },
      capabilities: { passed: [...requiredNativeCapabilities], failed: [] },
    },
    accessibility: { violations: 0 },
    performance: { failures: 0 },
    resources: Object.fromEntries(requiredResourceCounters.map((name) => [name, 0])),
    artifacts: {
      junit: "junit.xml",
      accessibility: "accessibility.json",
      performance: "performance.json",
      screenshots: { phone: "phone.png", tablet: "tablet.png" },
    },
  };
}

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), "harmony-device-results-"));
  for (const file of [
    "junit.xml",
    "accessibility.json",
    "phone.png",
    "tablet.png",
  ]) {
    await writeFile(resolve(directory, file), "evidence");
  }
  await writeFile(
    resolve(directory, "performance.json"),
    JSON.stringify(performanceReportFixture()),
  );
  return directory;
}

test("accepts complete native contract and quality evidence", async () => {
  const directory = await fixture();
  try {
    await writeFile(resolve(directory, "results.json"), JSON.stringify(result()));
    const value = await validateDeviceResults({ directory, commit, deviceName: "reference" });
    assert.equal(value.tests.passed, 61);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects stale identity, incomplete tests, contracts, and quality checks", async () => {
  const directory = await fixture();
  try {
    for (const mutate of [
      (value) => (value.commit = "b".repeat(40)),
      (value) => (value.device.apiLevel = 25),
      (value) => (value.device.formFactor = "watch"),
      (value) => (value.device.environment = "emulator"),
      (value) => (value.tests.failed = 1),
      (value) => (value.tests.skipped = 1),
      (value) => (value.tests.passed = 60),
      (value) => value.contracts.nativeElements.passed.pop(),
      (value) => value.contracts.nativeElements.passed.push("not-an-element"),
      (value) => value.contracts.nativeElements.passed[0] = value.contracts.nativeElements.passed[1],
      (value) => value.contracts.capabilities.passed.pop(),
      (value) => value.contracts.capabilities.failed.push("media"),
      (value) => (value.accessibility.violations = 1),
      (value) => (value.performance.failures = 1),
      (value) => (value.resources.watchers = 1),
      (value) => delete value.resources.fileHandles,
      (value) => (value.resources.unexpected = 0),
    ]) {
      const value = result();
      mutate(value);
      await writeFile(resolve(directory, "results.json"), JSON.stringify(value));
      await assert.rejects(
        validateDeviceResults({ directory, commit, deviceName: "reference" }),
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects missing and over-budget performance measurements", async () => {
  const directory = await fixture();
  try {
    const value = result();
    await writeFile(resolve(directory, "results.json"), JSON.stringify(value));
    const report = performanceReportFixture();
    delete report.metrics.firstNativeRevealMs;
    await writeFile(resolve(directory, "performance.json"), JSON.stringify(report));
    await assert.rejects(
      validateDeviceResults({ directory, commit, deviceName: "reference" }),
      /missing firstNativeRevealMs\.p95/u,
    );

    report.metrics.firstNativeRevealMs = { p95: 151 };
    await writeFile(resolve(directory, "performance.json"), JSON.stringify(report));
    await assert.rejects(
      validateDeviceResults({ directory, commit, deviceName: "reference" }),
      /budget is 150 ms/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects malformed profiles and unsafe or empty artifacts", async () => {
  const directory = await fixture();
  try {
    await assert.rejects(
      validateDeviceResults({ directory, commit: "invalid", deviceName: "reference" }),
    );
    for (const mutate of [
      (value) => (value.schemaVersion = 3),
      (value) => (value.device.model = ""),
      (value) => (value.artifacts.junit = "../junit.xml"),
      (value) => (value.artifacts.junit = "/junit.xml"),
      (value) => (value.artifacts.junit = "missing.xml"),
    ]) {
      const value = result();
      mutate(value);
      await writeFile(resolve(directory, "results.json"), JSON.stringify(value));
      await assert.rejects(
        validateDeviceResults({ directory, commit, deviceName: "reference" }),
      );
    }
    const value = result();
    await writeFile(resolve(directory, "junit.xml"), "");
    await writeFile(resolve(directory, "results.json"), JSON.stringify(value));
    await assert.rejects(
      validateDeviceResults({ directory, commit, deviceName: "reference" }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
