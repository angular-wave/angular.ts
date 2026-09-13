const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  assertReleaseBaseVersion,
  latestReleaseVersion,
  nextVersion,
  promoteChangelog,
  promoteIntegrationChangelog,
  readRemoteReleaseTags,
} = require("./prepare-release-version.cjs");

const releaseTags = [
  "1111111111111111111111111111111111111111\trefs/tags/v0.35.5",
  "2222222222222222222222222222222222222222\trefs/tags/v0.9.12",
  "3333333333333333333333333333333333333333\trefs/tags/v1.2.0",
  "4444444444444444444444444444444444444444\trefs/tags/v1.10.0",
  "5555555555555555555555555555555555555555\trefs/tags/not-a-release",
].join("\n");

test("calculates semantic release versions", () => {
  assert.equal(nextVersion("0.35.0", "major"), "1.0.0");
  assert.equal(nextVersion("0.35.0", "minor"), "0.36.0");
  assert.equal(nextVersion("0.35.0", "patch"), "0.35.1");
  assert.throws(() => nextVersion("next", "minor"), /Invalid current version/u);
  assert.throws(
    () => nextVersion("0.35.0", "preview"),
    /major, minor, or patch/u,
  );
});

test("requires release preparation to start from the latest release tag", () => {
  assert.equal(latestReleaseVersion(releaseTags), "1.10.0");
  assert.doesNotThrow(() => assertReleaseBaseVersion("1.10.0", releaseTags));
  assert.doesNotThrow(() => assertReleaseBaseVersion("0.1.0", ""));
  assert.throws(
    () => assertReleaseBaseVersion("1.2.0", releaseTags),
    /does not match latest release tag v1\.10\.0/u,
  );
});

test("reads canonical release tags non-interactively with a timeout", () => {
  const repository = "https://github.com/angular-wave/angular.ts.git";
  const result = readRemoteReleaseTags(repository, (command, args, options) => {
    assert.equal(command, "git");
    assert.deepEqual(args, ["ls-remote", "--tags", "--refs", repository, "v*"]);
    assert.equal(options.encoding, "utf8");
    assert.equal(options.env.GIT_TERMINAL_PROMPT, "0");
    assert.equal(options.timeout, 15_000);
    return releaseTags;
  });

  assert.equal(result, releaseTags);
  assert.throws(() => readRemoteReleaseTags(""), /release repository URL/u);
  assert.throws(
    () =>
      readRemoteReleaseTags(repository, () => {
        throw new Error("timed out");
      }),
    /Unable to read tags from the release repository/u,
  );
});

test("promotes Unreleased notes and leaves a new section", () => {
  const source =
    "# Changelog\n\n## [Unreleased]\n\n- Change.\n\n## [0.35.0] - 2026-09-05\n";
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

test("prepends integration package release notes", () => {
  assert.equal(
    promoteIntegrationChangelog(
      "# Changelog\n\n## 0.35.0\n\n- Previous.\n",
      "0.36.0",
    ),
    "# Changelog\n\n## 0.36.0\n\n- Updated bindings for AngularTS 0.36.0.\n\n## 0.35.0\n\n- Previous.\n",
  );
  assert.throws(
    () => promoteIntegrationChangelog("## 0.36.0\n", "0.36.0"),
    /already contains/u,
  );
});
