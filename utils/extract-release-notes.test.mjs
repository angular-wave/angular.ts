import assert from "node:assert/strict";
import test from "node:test";

import { extractReleaseNotes } from "./extract-release-notes.mjs";

const changelog = `# Changelog

## [Unreleased]

Work in progress.

## [1.2.3] - 2026-07-19

- Added a public feature.
- Removed obsolete configuration.

## [1.2.2] - 2026-07-01

- Previous release.
`;

test("extracts only the requested curated release section", () => {
  assert.equal(
    extractReleaseNotes(changelog, "1.2.3"),
    "- Added a public feature.\n- Removed obsolete configuration.",
  );
});

test("accepts a release tag", () => {
  assert.equal(extractReleaseNotes(changelog, "v1.2.2"), "- Previous release.");
});

test("rejects a missing release section", () => {
  assert.throws(
    () => extractReleaseNotes(changelog, "2.0.0"),
    /must contain a "## \[2\.0\.0\] - YYYY-MM-DD" section/,
  );
});

test("rejects an empty release section", () => {
  assert.throws(
    () =>
      extractReleaseNotes(
        "# Changelog\n\n## [1.0.0] - 2026-07-19\n\n<!-- Empty -->\n",
        "1.0.0",
      ),
    /release section 1\.0\.0 is empty/,
  );
});

test("rejects invalid versions", () => {
  assert.throws(
    () => extractReleaseNotes(changelog, "latest"),
    /Invalid release version/,
  );
});
