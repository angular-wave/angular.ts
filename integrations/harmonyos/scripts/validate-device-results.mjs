#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const integration = resolve(fileURLToPath(new URL("..", import.meta.url)));
const native = resolve(integration, "../native");
const formFactors = new Set(["phone", "tablet", "foldable", "2in1"]);
const environments = new Set(["physical", "cloud"]);
const minimumApiLevel = 26;

const [elementCatalog, capabilityCatalog] = await Promise.all([
  readFile(resolve(native, "native-elements.json"), "utf8"),
  readFile(resolve(native, "native-capabilities.json"), "utf8"),
]);

export const requiredNativeElements = Object.freeze(
  JSON.parse(elementCatalog).elements.map((element) => element.name).sort(),
);
export const requiredNativeCapabilities = Object.freeze(
  JSON.parse(capabilityCatalog).capabilities.map((capability) => capability.name).sort(),
);

function coversExactly(result, expected) {
  const passed = result?.passed;
  const failed = result?.failed;
  if (!Array.isArray(passed) || !Array.isArray(failed) || failed.length !== 0) {
    return false;
  }
  if (new Set(passed).size !== passed.length || passed.length !== expected.length) {
    return false;
  }
  return [...passed].sort().every((name, index) => name === expected[index]);
}

export async function validateDeviceResults({ directory, commit, deviceName }) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("Invalid evidence commit");
  const result = JSON.parse(await readFile(resolve(directory, "results.json"), "utf8"));
  if (result.schemaVersion !== 2 || result.platform !== "harmonyos") {
    throw new Error("Unsupported HarmonyOS evidence schema");
  }
  if (result.commit !== commit || result.device?.name !== deviceName) {
    throw new Error("HarmonyOS evidence identity does not match the workflow");
  }
  if (
    !result.device.model ||
    !result.device.osVersion ||
    !result.device.architecture ||
    !Number.isInteger(result.device.apiLevel) ||
    result.device.apiLevel < minimumApiLevel ||
    !formFactors.has(result.device.formFactor) ||
    !environments.has(result.device.environment)
  ) {
    throw new Error("HarmonyOS evidence lacks a supported device profile");
  }
  if (
    !Number.isInteger(result.tests?.passed) ||
    result.tests.passed < requiredNativeElements.length + requiredNativeCapabilities.length ||
    result.tests.failed !== 0 ||
    result.tests.skipped !== 0
  ) {
    throw new Error("HarmonyOS device tests did not pass completely");
  }
  if (!coversExactly(result.contracts?.nativeElements, requiredNativeElements) ||
      !coversExactly(result.contracts?.capabilities, requiredNativeCapabilities)) {
    throw new Error("HarmonyOS device evidence does not cover every native contract");
  }
  if (result.accessibility?.violations !== 0 || result.performance?.failures !== 0) {
    throw new Error("HarmonyOS accessibility or performance checks failed");
  }
  const files = [
    result.artifacts?.junit,
    result.artifacts?.accessibility,
    result.artifacts?.performance,
    result.artifacts?.screenshots?.phone,
    result.artifacts?.screenshots?.tablet,
  ];
  for (const relative of files) {
    if (
      typeof relative !== "string" ||
      !relative ||
      isAbsolute(relative) ||
      relative.split(/[\\/]/u).includes("..")
    ) {
      throw new Error("HarmonyOS evidence contains an unsafe artifact path");
    }
    const details = await stat(resolve(directory, relative));
    if (!details.isFile() || details.size === 0) {
      throw new Error(`HarmonyOS evidence artifact is empty: ${relative}`);
    }
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(
    process.argv[2] ?? resolve(integration, "build/device-results"),
  );
  const result = await validateDeviceResults({
    directory,
    commit: process.env.GITHUB_SHA ?? "",
    deviceName: process.env.DEVICE_NAME ?? "",
  });
  console.log(
    `Validated ${result.tests.passed} HarmonyOS device tests on ${result.device.model}.`,
  );
}
