const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  nextVersion,
  promoteChangelog,
} = require("./prepare-release-version.cjs");

test("calculates semantic release versions", () => {
  assert.equal(nextVersion("0.35.0", "major"), "1.0.0");
  assert.equal(nextVersion("0.35.0", "minor"), "0.36.0");
  assert.equal(nextVersion("0.35.0", "patch"), "0.35.1");
  assert.throws(() => nextVersion("next", "minor"), /Invalid current version/u);
  assert.throws(() => nextVersion("0.35.0", "preview"), /major, minor, or patch/u);
});

test("promotes Unreleased notes and leaves a new section", () => {
  const source = "# Changelog\n\n## [Unreleased]\n\n- Change.\n\n## [0.35.0] - 2026-09-05\n";
  assert.equal(
    promoteChangelog(source, "0.36.0", "2026-09-06"),
    "# Changelog\n\n## [Unreleased]\n\n## [0.36.0] - 2026-09-06\n\n- Change.\n\n## [0.35.0] - 2026-09-05\n",
  );
});

test("rejects missing or empty Unreleased notes", () => {
  assert.throws(
    () => promoteChangelog("# Changelog\n", "0.36.0", "2026-09-06"),
    /must contain an Unreleased section/u,
  );
  assert.throws(
    () =>
      promoteChangelog(
        "# Changelog\n\n## [Unreleased]\n\n## [0.35.0]\n",
        "0.36.0",
        "2026-09-06",
      ),
    /must not be empty/u,
  );
});
