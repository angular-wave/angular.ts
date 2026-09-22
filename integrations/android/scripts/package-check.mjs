import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { androidArtifacts } from "./android-artifacts.mjs";
import { validateAndroidPom } from "./pom-contract.mjs";

const root = new URL("../", import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
);

for (const { module, artifact, extension } of androidArtifacts) {
  const pom = await readFile(
    new URL(`${module}/build/publications/maven/pom-default.xml`, root),
    "utf8",
  );
  assert.ok(pom.includes(`<artifactId>${artifact}</artifactId>`), `${module} has a stale artifact ID`);
  const packaging = pom.match(/<packaging>([^<]+)<\/packaging>/)?.[1] ?? "jar";
  assert.equal(packaging, extension, `${module} has stale packaging`);
  validateAndroidPom(pom, { artifact, module, version });
}

for (const { module, maximumBytes } of androidArtifacts.filter(
  ({ extension }) => extension === "aar",
)) {
  const artifact = new URL(`${module}/build/outputs/aar/${module}-release.aar`, root);
  const metadata = await stat(artifact);

  assert.ok(
    metadata.size <= maximumBytes,
    `${module} release AAR is ${metadata.size} bytes; budget is ${maximumBytes}`,
  );
}

const compilerDirectory = new URL("native-elements-compiler/build/libs/", root);
const compilerJar = (await readdir(compilerDirectory)).find(
  (name) => name.endsWith(".jar") && !name.includes("javadoc") && !name.includes("sources"),
);
assert.ok(compilerJar, "Native element metadata compiler JAR is missing");
assert.ok(
  (await stat(new URL(compilerJar, compilerDirectory))).size <=
    androidArtifacts.find(({ module }) => module === "native-elements-compiler").maximumBytes,
  "Native element metadata compiler exceeds its size budget",
);

console.log("Android release AAR and dependency budgets passed.");
