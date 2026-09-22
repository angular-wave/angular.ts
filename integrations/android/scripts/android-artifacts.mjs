import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const manifest = JSON.parse(
  await readFile(new URL("../android-artifacts.json", import.meta.url), "utf8"),
);

assert.ok(Array.isArray(manifest) && manifest.length > 0, "Android artifacts must not be empty");

const fields = [
  "module",
  "artifact",
  "extension",
  "maximumBytes",
  "sourceEntry",
];
for (const entry of manifest) {
  for (const field of fields) {
    assert.ok(entry[field], `Android artifact is missing ${field}`);
  }
  assert.match(entry.module, /^[a-z][a-z0-9-]*$/);
  assert.match(entry.artifact, /^angular-native-[a-z0-9-]+$/);
  assert.ok(entry.extension === "aar" || entry.extension === "jar");
  assert.ok(Number.isSafeInteger(entry.maximumBytes) && entry.maximumBytes > 0);
  assert.match(entry.sourceEntry, /^[A-Za-z0-9_$/.-]+\.(?:java|kt)$/u);
}

assert.equal(new Set(manifest.map(({ module }) => module)).size, manifest.length);
assert.equal(new Set(manifest.map(({ artifact }) => artifact)).size, manifest.length);

export const androidArtifacts = Object.freeze(
  manifest.map((entry) => Object.freeze({ ...entry })),
);

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const output = process.argv[2] ?? "artifact";
  const values = androidArtifacts.map((entry) => {
    switch (output) {
      case "artifact":
      case "module":
        return entry[output];
      case "package-task":
        return `${entry.module}:${entry.extension === "aar" ? "assembleRelease" : "build"}`;
      case "pom-task":
        return `${entry.module}:generatePomFileForMavenPublication`;
      default:
        throw new Error(`Unknown Android artifact output: ${output}`);
    }
  });
  process.stdout.write(`${values.join("\n")}\n`);
}
