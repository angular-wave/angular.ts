#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const summaryPattern = /OHOS_REPORT_RESULT:\s*stream=Tests run:\s*(\d+),\s*Failure:\s*(\d+),\s*Error:\s*(\d+),\s*Pass:\s*(\d+),\s*Ignore:\s*(\d+)/gu;
const codePattern = /OHOS_REPORT_CODE:\s*(-?\d+)/gu;

export function parseDeviceTestOutput(output) {
  const summaries = [...output.matchAll(summaryPattern)];
  const codes = [...output.matchAll(codePattern)];
  if (summaries.length !== 1 || codes.length !== 1) {
    throw new Error("Hypium output must contain exactly one result and exit code");
  }
  const values = summaries[0].slice(1).map((value) => Number.parseInt(value, 10));
  const [total, failed, errors, passed, ignored] = values;
  const code = Number.parseInt(codes[0][1], 10);
  if (total < 1 || total !== failed + errors + passed + ignored) {
    throw new Error("Hypium result counts are inconsistent");
  }
  if (code !== 0 || failed !== 0 || errors !== 0 || ignored !== 0 || passed !== total) {
    throw new Error(
      `Hypium device tests failed: ${passed}/${total} passed, ${failed} failed, ${errors} errors, ${ignored} ignored, code ${code}`,
    );
  }
  if (/OHOS_REPORT_STATUS_CODE:\s*-[12](?:\s|$)/u.test(output)) {
    throw new Error("Hypium output contains a failed test status");
  }
  return {
    schemaVersion: 1,
    framework: "hypium",
    total,
    passed,
    failed,
    errors,
    ignored,
  };
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (input === undefined || output === undefined) {
    throw new Error("Usage: parse-device-test-output.mjs <hypium.log> <result.json>");
  }
  const result = parseDeviceTestOutput(await readFile(resolve(input), "utf8"));
  const destination = resolve(output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`HarmonyOS device tests passed: ${result.passed}/${result.total}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
