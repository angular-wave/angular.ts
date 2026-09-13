import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { androidArtifacts } from "./android-artifacts.mjs";

const root = new URL("../", import.meta.url);

test("manifest contains every published Android module", async () => {
  const publishedModules = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const buildFile = new URL(`${entry.name}/build.gradle.kts`, root);
    let source;
    try {
      source = await readFile(buildFile, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (source.includes('id("com.vanniktech.maven.publish")')) {
      publishedModules.push(entry.name);
    }
  }

  assert.deepEqual(
    androidArtifacts.map(({ module }) => module).sort(),
    publishedModules.sort(),
  );
});

test("manifest modules are included in the Android build", async () => {
  const settings = await readFile(new URL("settings.gradle.kts", root), "utf8");
  for (const { module } of androidArtifacts) {
    assert.ok(settings.includes(`include(":${module}")`), `${module} is missing from settings`);
  }
});

test("publication uses the current Central API and strong checksums", async () => {
  const build = await readFile(new URL("build.gradle.kts", root), "utf8");
  const properties = await readFile(new URL("gradle.properties", root), "utf8");
  const checksums =
    properties
      .match(/^mavenCentralChecksums=(.+)$/mu)?.[1]
      ?.split(",")
      .map((value) => value.trim()) ?? [];

  assert.ok(checksums.includes("sha256"));
  assert.ok(checksums.includes("sha512"));
  assert.match(build, /tasks\.withType<AbstractArchiveTask>\(\)\.configureEach/u);
  assert.match(build, /isPreserveFileTimestamps = false/u);
  assert.match(build, /isReproducibleFileOrder = true/u);

  for (const { module } of androidArtifacts) {
    const source = await readFile(
      new URL(`${module}/build.gradle.kts`, root),
      "utf8",
    );
    assert.match(source, /publishToMavenCentral\(\)/u);
    assert.doesNotMatch(source, /SonatypeHost|publishJavadocJar/u);
  }
});
