import assert from "node:assert/strict";
import test from "node:test";
import { validateAndroidPom } from "./pom-contract.mjs";

const dependency = (group, artifact, version, scope, type = "jar") => `
  <dependency>
    <groupId>${group}</groupId>
    <artifactId>${artifact}</artifactId>
    ${version ? `<version>${version}</version>` : ""}
    <type>${type}</type>
    <scope>${scope}</scope>
  </dependency>`;

const pom = (dependencies, description = "Media support") => `
  <project>
    <name>Angular Native Media</name>
    <description>${description}</description>
    <url>https://github.com/angular-wave/angular.ts</url>
    <licenses><license><name>MIT License</name></license></licenses>
    <developers><developer><id>angular-wave</id></developer></developers>
    <scm><url>https://github.com/angular-wave/angular.ts.git</url></scm>
    <dependencies>${dependencies.join("")}</dependencies>
  </project>`;

const mediaDependencies = (version = "0.35.1") => [
  dependency(
    "io.github.angular-wave",
    "angular-native-navigation",
    version,
    "compile",
  ),
  dependency("androidx.startup", "startup-runtime", "1.2.0", "runtime"),
  dependency("androidx.media3", "media3-exoplayer", "1.11.1", "runtime"),
];

const media = {
  artifact: "angular-native-media",
  module: "media",
  version: "0.35.1",
};

test("accepts complete Android publication metadata and dependency scopes", () => {
  validateAndroidPom(pom(mediaDependencies()), media);
});

test("rejects incomplete metadata and missing required dependencies", () => {
  assert.throws(
    () => validateAndroidPom(pom(mediaDependencies(), ""), media),
    /missing its description/u,
  );
  assert.throws(
    () => validateAndroidPom(pom(mediaDependencies().slice(0, -1)), media),
    /missing media3-exoplayer with runtime scope/u,
  );
});

test("rejects stale internal versions and forbidden dependency scopes", () => {
  assert.throws(
    () => validateAndroidPom(pom(mediaDependencies("0.35.0")), media),
    /instead of 0[.]35[.]1/u,
  );
  assert.throws(
    () =>
      validateAndroidPom(
        pom([
          ...mediaDependencies(),
          dependency("example", "test-only", "1.0.0", "test"),
        ]),
        media,
      ),
    /forbidden test scope/u,
  );
});

test("keeps optional dependencies out of core publication", () => {
  assert.throws(
    () =>
      validateAndroidPom(
        pom([
          dependency(
            "androidx.credentials",
            "credentials",
            "1.6.0",
            "runtime",
          ),
        ]),
        {
          artifact: "angular-native-core",
          module: "core",
          version: "0.35.1",
        },
      ),
    /leaks optional dependency/u,
  );
});
