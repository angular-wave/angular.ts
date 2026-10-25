#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdir,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeviceTestOutput } from "./parse-device-test-output.mjs";

const integration = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function parseDeviceTargets(output) {
  const devices = output
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter((value) => value !== "" && value !== "[Empty]");
  if (devices.length !== 1) {
    throw new Error(`Exactly one online HarmonyOS device is required; found ${devices.length}`);
  }
  return devices[0];
}

export async function resolveSignedHap(root, explicit, target) {
  if (explicit !== undefined && explicit !== "") {
    const selected = resolve(explicit);
    await requireSignedFile(selected, target);
    return selected;
  }
  const files = await collectFiles(resolve(root, "entry", "build"));
  const segment = `${sep}outputs${sep}${target}${sep}`;
  const matches = files.filter(
    (file) => file.includes(segment) && file.endsWith("-signed.hap"),
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one signed ${target} HAP; found ${matches.length}`);
  }
  return matches[0];
}

export async function runDeviceTests({
  root = integration,
  environment = process.env,
  execute = executeCommand,
} = {}) {
  const targetOutput = execute("hdc", ["list", "targets"]);
  const device = parseDeviceTargets(targetOutput.stdout);
  const mainHap = await resolveSignedHap(root, environment.HARMONY_MAIN_HAP, "default");
  const testHap = await resolveSignedHap(root, environment.HARMONY_TEST_HAP, "ohosTest");
  execute("hdc", ["-t", device, "install", "-r", mainHap]);
  execute("hdc", ["-t", device, "install", "-r", testHap]);
  const testOutput = execute("hdc", [
    "-t",
    device,
    "shell",
    "aa",
    "test",
    "-b",
    "io.github.angularwave.harmony.proof",
    "-m",
    "entry_test",
    "-s",
    "unittest",
    "/ets/testrunner/OpenHarmonyTestRunner",
    "-s",
    "timeout",
    "600000",
  ]).stdout;
  const result = parseDeviceTestOutput(testOutput);
  const results = resolve(root, "build", "device-results");
  await mkdir(results, { recursive: true });
  await writeFile(resolve(results, "hypium.log"), testOutput);
  await writeFile(
    resolve(results, "instrumentation.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  return { device, mainHap, testHap, result };
}

function executeCommand(command, argumentsValue) {
  const result = spawnSync(command, argumentsValue, { encoding: "utf8" });
  if (result.error !== undefined) {
    throw new Error(`Unable to execute ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${argumentsValue.join(" ")} failed with exit code ${result.status}:\n` +
        `${result.stderr}`,
    );
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

async function collectFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

async function requireSignedFile(path, target) {
  if (!basename(path).endsWith("-signed.hap")) {
    throw new Error(`${target} device package must be a signed HAP`);
  }
  const details = await stat(path);
  if (!details.isFile() || details.size === 0) {
    throw new Error(`${target} device package must be a non-empty file`);
  }
}

async function main() {
  const value = await runDeviceTests();
  process.stdout.write(
    `HarmonyOS device tests passed on ${value.device}: ` +
      `${value.result.passed}/${value.result.total}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
