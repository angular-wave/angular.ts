import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../../..");
const scalaRoot = path.join(root, "integrations/scala");
const packageJsonPath = path.join(root, "package.json");
const buildPath = path.join(scalaRoot, "build.sbt");
const pluginsPath = path.join(scalaRoot, "project/plugins.sbt");
const buildPropertiesPath = path.join(scalaRoot, "project/build.properties");
const makefilePath = path.join(scalaRoot, "Makefile");
const releaseNotesPath = path.join(scalaRoot, "RELEASE_NOTES.md");
const releaseReadinessPath = path.join(scalaRoot, "RELEASE_READINESS.md");
const parityPath = path.join(scalaRoot, "NG_NAMESPACE_PARITY.md");
const workflowPath = path.join(root, ".github/workflows/release.yml");
const docsPath = path.join(root, "docs/content/docs/integrations/scala.md");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
const build = fs.readFileSync(buildPath, "utf8");
const plugins = fs.readFileSync(pluginsPath, "utf8");
const buildProperties = fs.readFileSync(buildPropertiesPath, "utf8");
const makefile = fs.readFileSync(makefilePath, "utf8");
const releaseNotes = fs.existsSync(releaseNotesPath)
  ? fs.readFileSync(releaseNotesPath, "utf8")
  : "";
const releaseReadiness = fs.readFileSync(releaseReadinessPath, "utf8");
const parity = fs.readFileSync(parityPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const docs = fs.readFileSync(docsPath, "utf8");

const failures = [];

if (!version) {
  failures.push("Root package.json must define a version.");
}

if (!build.includes("ThisBuild / version := angularTsRuntimeVersion.value")) {
  failures.push("Scala build.sbt must derive package version from AngularTS runtime version.");
}

if (!build.includes('name := "angular-ts-scala"')) {
  failures.push('Scala build.sbt must publish the "angular-ts-scala" artifact.');
}

if (!build.includes('ThisBuild / organization := "io.github.angular-wave"')) {
  failures.push("Scala build.sbt must use the verified io.github.angular-wave namespace.");
}

for (const metadata of ["homepage", "scmInfo", "developers", "licenses"]) {
  if (!build.includes(`ThisBuild / ${metadata}`)) {
    failures.push(`Scala build.sbt must define Central POM metadata: ${metadata}.`);
  }
}

if (!build.includes("else localStaging.value")) {
  failures.push("Scala releases must stage through sbt's Central Portal repository.");
}

if (!plugins.includes('"sbt-pgp" % "2.3.1"')) {
  failures.push("Scala publication must use the pinned sbt-pgp signing plugin.");
}

const sbtVersion = /^sbt\.version=(\d+)\.(\d+)\.(\d+)$/m.exec(buildProperties);
if (!sbtVersion || Number(sbtVersion[1]) < 1 || Number(sbtVersion[2]) < 11) {
  failures.push("Scala Central Portal publication requires sbt 1.11 or newer.");
}

if (!releaseNotes.includes(`AngularTS npm package: ${version}`)) {
  failures.push(
    `Scala release notes must name compatible AngularTS npm package version ${version}.`,
  );
}

if (
  !releaseNotes.includes(
    "Maven coordinate: io.github.angular-wave:angular-ts-scala_sjs1_3",
  )
) {
  failures.push("Scala release notes must document the Maven coordinate.");
}

if (!makefile.includes('"angularTsScala/publishSigned" sonaRelease')) {
  failures.push("Scala Makefile must provide signed Central Portal publication.");
}

if (
  !workflow.includes("publish-scala:") ||
  !workflow.includes("make -C integrations/scala publish-central")
) {
  failures.push("Release workflow must publish the Scala.js artifact.");
}

if (!docs.includes('"io.github.angular-wave" %%% "angular-ts-scala"')) {
  failures.push("Scala integration docs must show the published dependency.");
}

if (/\|\s*`[^`]+`\s*\|\s*planned\s*\|/.test(parity)) {
  failures.push("Scala namespace parity must not contain planned entries for release readiness.");
}

if (
  !releaseReadiness.includes(
    "- [x] The release notes name the compatible AngularTS npm package version.",
  )
) {
  failures.push("Scala release readiness gate must mark release-note compatibility complete.");
}

if (
  !releaseReadiness.includes(
    "- [x] Tag releases publish signed artifacts through the Central Portal.",
  )
) {
  failures.push("Scala release readiness gate must mark Central publication complete.");
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  `Scala release metadata matches AngularTS ${version}, uses signed Central Portal publication, and has no planned namespace parity entries.`,
);
