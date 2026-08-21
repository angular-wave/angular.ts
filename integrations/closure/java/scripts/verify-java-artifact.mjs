import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const javaRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(javaRoot, "../../..");
const version = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
).version;
const jar = resolve(javaRoot, "target", `angular-ts-java-${version}.jar`);
const entries = new Set(
  execFileSync("jar", ["tf", jar], { encoding: "utf8" })
    .trim()
    .split("\n"),
);

for (const entry of [
  "org/angular/ts/ng/NgModule.class",
  "org/angular/ts/annotation/AngularEntryPoint.class",
  "org/angular/ts/annotation/AngularTemplateApi.class",
  "org/angular/ts/processor/AngularClosureProcessor.class",
  "META-INF/services/javax.annotation.processing.Processor",
]) {
  assert(entries.has(entry), `Java package is missing ${entry}`);
}

for (const entry of entries) {
  assert(!entry.startsWith("org/angular/ts/demo/"), `Package leaks demo class: ${entry}`);
}

const extraction = mkdtempSync(resolve(tmpdir(), "angular-ts-java-artifact-"));
try {
  const service = "META-INF/services/javax.annotation.processing.Processor";
  execFileSync("jar", ["xf", jar, service], { cwd: extraction });
  assert.equal(
    readFileSync(resolve(extraction, service), "utf8").trim(),
    "org.angular.ts.processor.AngularClosureProcessor",
  );
} finally {
  rmSync(extraction, { force: true, recursive: true });
}

console.log(`Java package contract passed for angular-ts-java-${version}.jar.`);
