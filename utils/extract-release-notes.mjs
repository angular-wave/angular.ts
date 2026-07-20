import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function extractReleaseNotes(changelog, requestedVersion) {
  const version = requestedVersion.startsWith("v")
    ? requestedVersion.slice(1)
    : requestedVersion;

  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid release version: ${requestedVersion}`);
  }

  const heading = new RegExp(
    `^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`,
    "m",
  );
  const match = heading.exec(changelog);

  if (!match) {
    throw new Error(
      `CHANGELOG.md must contain a "## [${version}] - YYYY-MM-DD" section`,
    );
  }

  const bodyStart = match.index + match[0].length;
  const remaining = changelog.slice(bodyStart);
  const nextHeading = /^## /m.exec(remaining);
  const bodyEnd = nextHeading ? nextHeading.index : remaining.length;
  const notes = remaining.slice(0, bodyEnd).trim();

  if (!notes || !/\S/.test(notes.replace(/<!--[^]*?-->/g, ""))) {
    throw new Error(`CHANGELOG.md release section ${version} is empty`);
  }

  return notes;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
  const requestedVersion = process.argv[2];

  if (!requestedVersion) {
    throw new Error(
      "Usage: node utils/extract-release-notes.mjs <version-or-tag>",
    );
  }

  const changelog = readFileSync("CHANGELOG.md", "utf8");
  process.stdout.write(`${extractReleaseNotes(changelog, requestedVersion)}\n`);
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main();
}
