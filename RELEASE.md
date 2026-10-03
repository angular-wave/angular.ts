# Release procedure

AngularTS uses one version for npm and its maintained language packages. A
release tag publishes npm, Java, ClojureScript, Scala.js, Dart, and Gleam from
GitHub Actions. It also publishes the Android core, navigation, optional UI,
custom-component sample, and metadata compiler artifacts to Maven Central.
HarmonyOS HAR packages use the same version but follow OHPM's reviewed,
interactive publication flow.

## Registry setup

This setup is required once per registry or when credentials change.

- Configure npm trusted publishing for this repository and
  `.github/workflows/release.yml`.
- Add `MAVEN_CENTRAL_USERNAME`, `MAVEN_CENTRAL_TOKEN`,
  `MAVEN_GPG_PRIVATE_KEY`, and `MAVEN_GPG_PASSPHRASE` as GitHub Actions
  secrets.
- Add a Hex API key with write access as `HEXPM_API_KEY`.
- Publish the first Dart `angular_ts` version manually. Then enable pub.dev
  GitHub Actions publishing for `angular-wave/angular.ts` with tag pattern
  `v{{version}}`.
- Create the `angular-wave` organization in the OpenHarmony third-party
  registry. Add the maintainer's encrypted OHPM public key, then configure
  `publish_registry`, `publish_id`, and `key_path` with `ohpm config` on the
  secured HarmonyOS release machine.
- Add `HARMONY_COMMAND_LINE_TOOLS_URL` and
  `HARMONY_COMMAND_LINE_TOOLS_SHA256` as repository secrets. The URL must fetch
  the official Linux command-line bundle; the digest must be copied from a
  separately verified source. Hosted HarmonyOS workflows reject a missing or
  mismatched digest.

Pub.dev documents its bootstrap requirement in the
[automated publishing guide](https://dart.dev/tools/pub/automated-publishing).

## Write release notes

Record user-visible changes under `Unreleased` in `CHANGELOG.md`. The section
must contain at least one entry before preparing a release.

Keep the notes short. Call out breaking API changes directly and use the names
developers will see in errors, imports, or migration work.

## Choose the version

Run exactly one preparation target:

```bash
make prepare-patch-release
make prepare-minor-release
make prepare-major-release
```

Use:

- `patch` for compatible fixes.
- `minor` for new features and breaking changes while AngularTS is below
  version 1.0.
- `major` when intentionally moving to the next major version.

The selected target:

1. Confirms the current version matches the latest stable tag in the release
   repository declared by `package.json`, then calculates the next semantic
   version.
2. Promotes `Unreleased` to a dated changelog entry.
3. Leaves a new empty `Unreleased` section.
4. Synchronizes npm, Maven, Scala.js, Dart, Gleam, HarmonyOS, integration docs,
   and tested consumer examples.
5. Regenerates versioned website and distribution files.
6. Runs the complete local release gate.

The update is transactional. Missing notes or stale integration metadata stop
the command before it writes any files. A stale local release version also
stops preparation; synchronize with the release repository and retry.

If the version is already prepared, run this instead of selecting another
bump:

```bash
make prepare-release
```

## Commit the prepared release

Review the version, changelog, generated bundles, package metadata, and
integration coordinates. Then commit and push the complete preparation:

```bash
git add .
git commit -m "Release <version>"
git push origin master
```

The local release gate runs the pre-commit suite, npm package verification, and
all maintained integration package and runtime tests. This includes Dart tests
in Chrome, which otherwise run only after a release tag reaches GitHub
Actions. Android release checks also exercise every signing task with a
disposable test key; GitHub Actions uses the configured release key only after
all portable checks pass.

The pre-commit hook must pass. Do not bypass it. The release command rejects a
dirty worktree or a local commit that does not match `origin/master`.

## Optional Android hardware evidence

When a supported Android reference device is attached to a self-hosted runner
labeled `self-hosted`, `linux`, `android`, and `physical`, you can run the
`Android Physical Device` workflow against the pushed release commit. Set
`device_name` to a short stable name and set `expected_api` when the run targets
a specific Android API level.

```bash
gh workflow run android-physical.yml \
  --ref master \
  -f device_name=release-reference \
  -f expected_api=37
```

When a physical runner is available, run this workflow before or after the
release to collect compatibility and performance trends. It retains reports,
benchmark JSON, profiles, logs, traces, and device identity as one evidence
artifact. Hardware availability never blocks tagging or publication; portable
CI and emulator-connected tests are the release gates.

## Create the release tag

From the clean release commit, run:

```bash
make publish-release
```

This reruns the complete release gate against the clean commit, confirms that
validation did not change tracked files, then creates and pushes `v<version>`.
Do not create or move release tags manually.

## Automated publication

The tag starts `.github/workflows/release.yml`. The workflow:

1. Checks registry credentials and pub.dev ownership.
2. Runs the complete CI workflow against the tagged commit.
3. Publishes Java, ClojureScript, Scala.js, and every Android artifact to Maven Central.
4. Publishes Dart to pub.dev and Gleam to Hex.
5. Downloads and validates the published artifacts with fresh consumers.
6. Builds and publishes the exact npm tarball with provenance.
7. Publishes the GitHub release only after every registry succeeds.

The release is complete only when the entire Release workflow is green. Do not
publish individual packages from a workstation to work around a failed job.

## Publish HarmonyOS packages

HarmonyOS packages are published only after the portable release is green and
the exact release commit has successful device or Huawei cloud evidence. On a
machine with Huawei's official API 26 SDK and command-line tools, run:

```bash
make -C integrations/harmonyos publish-release
```

This builds every HAR and HAP, runs Code Linter, compiles an isolated HAR
consumer, requires complete Android/Harmony contract parity, verifies native
evidence, and submits the HAR files in dependency order. The encrypted key
prompt is intentionally interactive; do not put its passphrase in a command,
workflow file, or process argument.

The native workflow accepts evidence only when its result manifest matches the
release commit and reports all 44 element contracts, all 17 capabilities, no
failed or skipped tests, no accessibility or performance failures, JUnit
output, and phone and tablet screenshots.

Prefer the `harmonyos-hars-<commit>` artifact retained by the successful native
workflow. Download it, verify `SHA256SUMS`, and publish those exact files:

```bash
HARMONY_OHPM_ARTIFACT_DIR="$PWD/harmonyos-hars-<commit>" \
  make -C integrations/harmonyos publish
```

OHPM reviews each package before it becomes public. If submission stops after
some packages entered review, list those package names or module names instead
of resubmitting them:

```bash
HARMONY_OHPM_SKIP_PACKAGES=core,navigation \
  make -C integrations/harmonyos publish
```

After every package is approved, verify registry metadata and compile a clean
application against exact registry versions:

```bash
make -C integrations/harmonyos verify-published
```

The same verification can run on the tagged commit through the Release
workflow's manual dispatch by selecting `verify_harmony`. HarmonyOS publication
is complete only after that clean registry consumer passes.

## Recover a partial release

First rerun a failed GitHub Actions job if the failure was transient. Registry
packages are immutable, so do not move the tag or overwrite an existing
version.

Use the Release workflow's manual dispatch with the existing tag only when all
Maven, Dart, and Gleam artifacts were published but npm or the GitHub release
did not finish. The recovery path verifies those artifacts before resuming npm
and GitHub publication.

OHPM submissions may remain under review while other registries complete. Use
`HARMONY_OHPM_SKIP_PACKAGES` to recover a partial submission and
`verify-published` after approval. Never resubmit, unpublish, or replace an
immutable approved version.

If published artifacts contain a defect, prepare a new patch release instead
of reusing the version.

## Roll back an Android application

Pin AngularTS and every `angular-native-*` dependency to the same last-known-good
version. Never mix Android AAR versions or pair them with a different AngularTS
runtime version. Maven Central releases are immutable, so do not delete or
replace the defective artifacts.

Revert the defective source change on `master`, add a short compatibility note
to `CHANGELOG.md`, and prepare a patch release through the normal procedure.
The supported SDK, WebView, protocol, and device matrix is recorded in
`integrations/android/COMPATIBILITY.md`.
