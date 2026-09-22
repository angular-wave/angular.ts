import assert from "node:assert/strict";
import { test } from "node:test";
import {
  artifactSpecs,
  parseArguments,
  validateChecksum,
  validateEntries,
  validateGradleModule,
  validatePom,
} from "./check-published-maven-artifacts.mjs";

test("parses selected Maven artifacts and publication wait", () => {
  assert.deepEqual(
    parseArguments([
      "--version",
      "0.34.0",
      "--artifacts",
      "java,clojurescript,scala",
      "--wait-seconds",
      "600",
    ]),
    {
      artifacts: ["java", "clojurescript", "scala"],
      version: "0.34.0",
      waitSeconds: 600,
    },
  );
  assert.equal(artifactSpecs.scala.artifact, "angular-ts-scala_sjs1_3");
  assert.deepEqual(artifactSpecs.java.checksums, ["sha256", "sha512"]);
  assert.deepEqual(artifactSpecs.scala.checksums, ["sha1"]);
  assert.throws(
    () => parseArguments(["--version", "next", "--artifacts", "java"]),
    /semantic version/u,
  );
});

test("expands the Android publication catalog", () => {
  const parsed = parseArguments([
    "--version",
    "0.35.1",
    "--artifacts",
    "android",
  ]);

  assert.equal(parsed.artifacts.length, 9);
  assert.equal(
    artifactSpecs[parsed.artifacts[0]].artifact,
    "angular-native-core",
  );
  assert.equal(artifactSpecs[parsed.artifacts[0]].binaryExtension, "aar");
  assert.equal(artifactSpecs[parsed.artifacts[0]].androidModule, "core");
  assert.equal(artifactSpecs[parsed.artifacts.at(-1)].binaryExtension, "jar");
});

test("validates remote checksums", () => {
  const bytes = Buffer.from("published artifact");
  validateChecksum(
    bytes,
    "6a30a13adb74ff40b975424092c1fb3a7d84efa9c04b14595310b1e04501cd57",
    "sha256",
    "artifact.jar",
  );
  assert.throws(
    () => validateChecksum(bytes, "invalid", "sha256", "artifact.jar"),
    /invalid sha256/u,
  );
});

test("validates POM coordinates and package entries", () => {
  validatePom(
    "<groupId>io.github.angular-wave</groupId><artifactId>angular-ts-java</artifactId><version>0.34.0</version>",
    "angular-ts-java",
    "0.34.0",
  );
  validateEntries("one\ntwo\n", ["one", "two"], "artifact.jar");
  assert.throws(
    () => validateEntries("one\n", ["two"], "artifact.jar"),
    /missing 'two'/u,
  );
});

test("validates Gradle module coordinates", () => {
  validateGradleModule(
    JSON.stringify({
      component: {
        group: "io.github.angular-wave",
        module: "angular-native-core",
        version: "0.35.1",
      },
    }),
    "angular-native-core",
    "0.35.1",
  );
  assert.throws(
    () => validateGradleModule("{}", "angular-native-core", "0.35.1"),
    /invalid component group/u,
  );
  assert.throws(
    () => validateGradleModule("not json", "angular-native-core", "0.35.1"),
    /not valid JSON/u,
  );
});
