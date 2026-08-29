import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cljsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(cljsRoot, "../../..");
const version = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
).version;
const artifact = `angular-ts-cljs-${version}`;
const jar = resolve(cljsRoot, "target", `${artifact}.jar`);
const sourcesJar = resolve(cljsRoot, "target", `${artifact}-sources.jar`);
const javadocJar = resolve(cljsRoot, "target", `${artifact}-javadoc.jar`);
const pom = resolve(cljsRoot, "pom.xml");
const entries = new Set(
  execFileSync("jar", ["tf", jar], { encoding: "utf8" })
    .trim()
    .split("\n"),
);

for (const entry of [
  "angular_ts/core.cljs",
  "angular_ts/generated.cljs",
  "angular_ts/externs/angular.js",
  "META-INF/LICENSE",
  "META-INF/README.md",
]) {
  assert(entries.has(entry), `ClojureScript package is missing ${entry}`);
}

for (const entry of entries) {
  assert(!entry.startsWith("angular_ts/demo/"), `Package leaks demo source: ${entry}`);
  assert(!entry.startsWith("angular_ts/core_test"), `Package leaks test source: ${entry}`);
}

const sourceEntries = new Set(
  execFileSync("jar", ["tf", sourcesJar], { encoding: "utf8" })
    .trim()
    .split("\n"),
);
const javadocEntries = new Set(
  execFileSync("jar", ["tf", javadocJar], { encoding: "utf8" })
    .trim()
    .split("\n"),
);

assert(sourceEntries.has("angular_ts/core.cljs"));
assert(sourceEntries.has("angular_ts/generated.cljs"));
assert(javadocEntries.has("README.md"));

const metadata = readFileSync(pom, "utf8");
assert(metadata.includes("<groupId>io.github.angular-wave</groupId>"));
assert(metadata.includes("<artifactId>angular-ts-cljs</artifactId>"));
assert(metadata.includes(`<version>${version}</version>`));
assert(metadata.includes("<artifactId>maven-gpg-plugin</artifactId>"));
assert(metadata.includes("<artifactId>central-publishing-maven-plugin</artifactId>"));

console.log(`ClojureScript package contract passed for ${artifact}.jar.`);
