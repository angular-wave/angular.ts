const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const releaseFiles = [
  "integrations/scala/README.md",
  "integrations/scala/RELEASE_NOTES.md",
  "integrations/dart/pubspec.yaml",
  "integrations/gleam/examples/basic_app/manifest.toml",
  "integrations/gleam/gleam.toml",
  "integrations/closure/clojurescript/pom.xml",
  "integrations/closure/clojurescript/README.md",
  "integrations/closure/clojurescript/bin/pom.xml",
  "integrations/closure/clojurescript/bin/README.md",
  "integrations/closure/java/pom.xml",
  "integrations/closure/java/README.md",
  "integrations/closure/java/demo/pom.xml",
  "docs/content/docs/integrations/java-j2cl.md",
  "docs/content/docs/integrations/scala.md",
  "docs/content/docs/integrations/clojurescript.md",
  "src/docs-examples/integration-setup.test.ts",
];

function nextVersion(current, release) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`Invalid current version '${current}'.`);

  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);

  if (release === "major") return `${major + 1}.0.0`;
  if (release === "minor") return `${major}.${minor + 1}.0`;
  if (release === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Release must be major, minor, or patch; received '${release}'.`);
}

function promoteChangelog(source, version, date) {
  const pattern = /^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[)/m;
  const match = pattern.exec(source);
  if (!match) throw new Error("CHANGELOG.md must contain an Unreleased section.");

  const notes = match[1].trim();
  if (!notes) throw new Error("CHANGELOG.md Unreleased section must not be empty.");

  return source.replace(
    pattern,
    `## [Unreleased]\n\n## [${version}] - ${date}\n\n${notes}\n\n`,
  );
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function prepare(release) {
  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  const current = packageJson.version;
  const version = nextVersion(current, release);
  const date = new Date().toISOString().slice(0, 10);
  const updates = new Map();

  packageJson.version = version;
  packageLock.version = version;
  if (!packageLock.packages?.[""]) {
    throw new Error("package-lock.json is missing its root package entry.");
  }
  packageLock.packages[""].version = version;
  updates.set("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  updates.set("package-lock.json", `${JSON.stringify(packageLock, null, 2)}\n`);
  updates.set(
    "CHANGELOG.md",
    promoteChangelog(read("CHANGELOG.md"), version, date),
  );

  for (const relativePath of releaseFiles) {
    const source = read(relativePath);
    if (!source.includes(current)) {
      throw new Error(`${relativePath} does not contain current version ${current}.`);
    }
    updates.set(relativePath, source.replaceAll(current, version));
  }

  for (const [relativePath, source] of updates) {
    fs.writeFileSync(path.join(root, relativePath), source);
  }

  console.log(`Prepared AngularTS ${version} (${release}) across ${updates.size} files.`);
}

module.exports = { nextVersion, promoteChangelog };

if (require.main === module) {
  try {
    prepare(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
