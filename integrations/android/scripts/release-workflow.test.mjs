import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const release = await readFile(
  new URL("../../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);
const ci = await readFile(
  new URL("../../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

function parseJobs(workflow) {
  const source = workflow.slice(workflow.indexOf("\njobs:\n") + 7);
  const headings = [...source.matchAll(/^  ([a-z][a-z0-9-]+):\n/gmu)];
  return new Map(
    headings.map((heading, index) => [
      heading[1],
      source.slice(heading.index, headings[index + 1]?.index ?? source.length),
    ]),
  );
}

const releaseJobs = parseJobs(release);
const ciJobs = parseJobs(ci);

function job(jobs, name, workflow) {
  const source = jobs.get(name);
  assert.ok(source, `Missing ${workflow} job ${name}`);
  return source;
}

const releaseJob = (name) => job(releaseJobs, name, "release");
const ciJob = (name) => job(ciJobs, name, "CI");

test("package publication depends on portable CI rather than physical hardware", () => {
  assert.equal(releaseJobs.has("android-physical-evidence"), false);
  for (const name of [
    "publish-dart",
    "publish-gleam",
    "publish-java",
    "publish-clojurescript",
    "publish-scala",
    "publish-android",
  ]) {
    assert.match(
      releaseJob(name),
      /needs: verify/u,
      `${name} must wait for the portable CI workflow`,
    );
    assert.doesNotMatch(releaseJob(name), /physical-evidence/u);
  }

  const finalPublication = releaseJob("publish");
  assert.doesNotMatch(finalPublication, /android-physical-evidence/u);
  assert.match(finalPublication, /needs\.verify\.result == 'success'/u);
});

test("published Maven validation includes the complete Android catalog", () => {
  const source = releaseJob("validate-maven");

  assert.match(source, /--artifacts java,clojurescript,scala,android/u);
  assert.match(source, /Compile a clean Maven consumer/u);
  assert.doesNotMatch(source, /mapfile -t artifacts/u);
});

test("language package validation waits for clean consumers to resolve", () => {
  const source = releaseJob("validate-language-packages");

  assert.match(source, /for attempt in \{1\.\.60\}; do[\s\S]*dart pub get/u);
  assert.match(source, /pub\.dev package did not become resolvable/u);
  assert.match(source, /for attempt in \{1\.\.60\}; do[\s\S]*gleam add/u);
  assert.match(source, /Hex package did not become resolvable/u);
});

test("workflow dispatch can recover a missing Java publication", () => {
  const preflight = releaseJob("release-preflight");
  const java = releaseJob("publish-java");
  const finalPublication = releaseJob("publish");

  assert.match(release, /publish_java:[\s\S]*type: boolean/u);
  assert.match(preflight, /github\.event_name == 'push' \|\| inputs\.publish_java/u);
  assert.match(java, /github\.event_name == 'push' \|\| inputs\.publish_java/u);
  assert.match(java, /id: registry/u);
  assert.match(java, /if: steps\.registry\.outputs\.exists != 'true'/u);
  assert.match(
    finalPublication,
    /!inputs\.publish_java \|\| needs\.publish-java\.result == 'success'/u,
  );
});

test("CI gate requires every first-class job to pass", () => {
  const gate = ciJob("ci-gate");
  for (const name of [...ciJobs.keys()].filter((name) => name !== "ci-gate")) {
    assert.match(
      gate,
      new RegExp(`^      - ${name}$`, "mu"),
      `CI gate must depend on ${name}`,
    );
    assert.match(
      gate,
      new RegExp(`needs\\.${name}\\.result != 'success'`, "u"),
      `CI gate must reject a failed ${name} job`,
    );
  }
});
