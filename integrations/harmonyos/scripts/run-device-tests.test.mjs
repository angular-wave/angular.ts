import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  parseDeviceTargets,
  resolveSignedHap,
  runDeviceTests,
} from "./run-device-tests.mjs";

const passing = [
  "OHOS_REPORT_STATUS_CODE: 1",
  "OHOS_REPORT_STATUS_CODE: 0",
  "OHOS_REPORT_RESULT: stream=Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0",
  "OHOS_REPORT_CODE: 0",
  "",
].join("\n");

test("requires exactly one online HarmonyOS device", () => {
  assert.equal(parseDeviceTargets("device-1\n"), "device-1");
  assert.throws(() => parseDeviceTargets("[Empty]\n"), /found 0/u);
  assert.throws(() => parseDeviceTargets("one\ntwo\n"), /found 2/u);
});

test("discovers exact signed HAPs and executes the tracked suite", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "harmony-device-runner-"));
  try {
    const main = resolve(root, "entry/build/default/outputs/default/entry-signed.hap");
    const deviceTest = resolve(
      root,
      "entry/build/default/outputs/ohosTest/entry-ohosTest-signed.hap",
    );
    for (const file of [main, deviceTest]) {
      await mkdir(resolve(file, ".."), { recursive: true });
      await writeFile(file, "hap");
    }
    const calls = [];
    const outputs = ["device-1\n", "", "", passing];
    const value = await runDeviceTests({
      root,
      environment: {},
      execute(command, argumentsValue) {
        calls.push([command, argumentsValue]);
        return { stdout: outputs.shift(), stderr: "" };
      },
    });
    assert.equal(value.device, "device-1");
    assert.equal(value.mainHap, main);
    assert.equal(value.testHap, deviceTest);
    assert.equal(value.result.passed, 1);
    assert.equal(calls.length, 4);
    assert.deepEqual(calls[1][1].slice(-3), ["install", "-r", main]);
    assert.match(calls[3][1].join(" "), /entry_test.*OpenHarmonyTestRunner/u);
    assert.equal(
      JSON.parse(await readFile(resolve(root, "build/device-results/instrumentation.json"), "utf8")).passed,
      1,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects ambiguous, missing, empty, and unsigned device packages", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "harmony-device-packages-"));
  try {
    assert.rejects(() => resolveSignedHap(root, undefined, "default"), /found 0/u);
    const empty = resolve(root, "empty-signed.hap");
    await writeFile(empty, "");
    assert.rejects(() => resolveSignedHap(root, empty, "default"), /non-empty/u);
    const unsigned = resolve(root, "entry-unsigned.hap");
    await writeFile(unsigned, "hap");
    assert.rejects(() => resolveSignedHap(root, unsigned, "default"), /signed HAP/u);
    for (const name of ["one-signed.hap", "two-signed.hap"]) {
      const file = resolve(root, `entry/build/default/outputs/default/${name}`);
      await mkdir(resolve(file, ".."), { recursive: true });
      await writeFile(file, "hap");
    }
    assert.rejects(() => resolveSignedHap(root, undefined, "default"), /found 2/u);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
