import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../../..");
const scalaRoot = path.join(root, "integrations/scala");
const packageJsonPath = path.join(root, "package.json");
const buildPath = path.join(scalaRoot, "build.sbt");
const releaseNotesPath = path.join(scalaRoot, "RELEASE_NOTES.md");
const releaseReadinessPath = path.join(scalaRoot, "RELEASE_READINESS.md");
const parityPath = path.join(scalaRoot, "NG_NAMESPACE_PARITY.md");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
const build = fs.readFileSync(buildPath, "utf8");
const releaseNotes = fs.existsSync(releaseNotesPath)
  ? fs.readFileSync(releaseNotesPath, "utf8")
  : "";
const releaseReadiness = fs.readFileSync(releaseReadinessPath, "utf8");
const parity = fs.readFileSync(parityPath, "utf8");

const failures = [];

if (!version) {
  failures.push("Root package.json must define a version.");
}

if (!build.includes("ThisBuild / version := angularTsRuntimeVersion.value")) {
  failures.push("Scala build.sbt must derive package version from AngularTS runtime version.");
}

if (!build.includes('name := "angular-ts-scalajs"')) {
  failures.push('Scala build.sbt must publish the "angular-ts-scalajs" artifact.');
}

if (!releaseNotes.includes(`AngularTS npm package: ${version}`)) {
  failures.push(
    `Scala release notes must name compatible AngularTS npm package version ${version}.`,
  );
}

if (!releaseNotes.includes("Maven coordinates: io.github.angular-ts::angular-ts-scalajs")) {
  failures.push("Scala release notes must document the Maven coordinates.");
}

if (/\|\s*`[^`]+`\s*\|\s*planned\s*\|/.test(parity)) {
  failures.push("Scala namespace parity must not contain planned entries for release readiness.");
}

if (!releaseReadiness.includes("- [x] The release notes name the compatible AngularTS npm package version.")) {
  failures.push("Scala release readiness gate must mark release-note compatibility complete.");
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  `Scala release readiness metadata matches AngularTS ${version} and has no planned namespace parity entries.`,
);
