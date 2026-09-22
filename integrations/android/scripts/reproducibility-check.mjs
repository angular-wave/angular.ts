import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { androidArtifacts } from "./android-artifacts.mjs";

const [mode, manifestPath, repository] = process.argv.slice(2);
assert.ok(mode === "record" || mode === "verify", "Expected record or verify mode");
assert.ok(manifestPath, "Expected a digest manifest path");
assert.ok(repository, "Expected an isolated Maven repository path");

const packageJson = JSON.parse(
  await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
);
const version = packageJson.version;
const digests = {};
for (const { artifact, extension } of androidArtifacts) {
  const directory = join(repository, "io", "github", "angular-wave", artifact, version);
  for (const suffix of [`.${extension}`, "-sources.jar", "-javadoc.jar", ".pom", ".module"]) {
    const name = `${artifact}-${version}${suffix}`;
    const content = await readFile(join(directory, name));
    digests[`${artifact}/${name}`] = createHash("sha256").update(content).digest("hex");
  }
}

if (mode === "record") {
  await writeFile(manifestPath, `${JSON.stringify(digests, null, 2)}\n`);
  console.log(`Recorded ${Object.keys(digests).length} Android publication digests.`);
} else {
  const expected = JSON.parse(await readFile(manifestPath, "utf8"));
  const names = new Set([...Object.keys(expected), ...Object.keys(digests)]);
  const differences = [...names].filter((name) => digests[name] !== expected[name]);
  if (differences.length > 0) {
    console.error("Android publication artifacts are not reproducible:");
    for (const name of differences) {
      if (!(name in expected)) console.error(`- unexpected: ${name}`);
      else if (!(name in digests)) console.error(`- missing: ${name}`);
      else console.error(`- changed: ${name}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Verified ${Object.keys(digests).length} reproducible Android artifacts.`);
  }
}
