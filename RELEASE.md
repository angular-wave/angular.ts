# Release procedure

AngularTS uses one version for npm and its maintained language packages. A
release tag publishes npm, Java, ClojureScript, Scala.js, Dart, and Gleam from
GitHub Actions.

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

1. Calculates the next semantic version.
2. Promotes `Unreleased` to a dated changelog entry.
3. Leaves a new empty `Unreleased` section.
4. Synchronizes npm, Maven, Scala.js, Dart, Gleam, integration docs, and tested
   consumer examples.
5. Regenerates versioned website and distribution files.
6. Runs the release preflight.

The update is transactional. Missing notes or stale integration metadata stop
the command before it writes any files.

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

The pre-commit hook must pass. Do not bypass it. The release command rejects a
dirty worktree or a local commit that does not match `origin/master`.

## Create the release tag

From the clean release commit, run:

```bash
make publish-release
```

This creates and pushes `v<version>`. Do not create or move release tags
manually.

## Automated publication

The tag starts `.github/workflows/release.yml`. The workflow:

1. Checks registry credentials and pub.dev ownership.
2. Runs the complete CI workflow against the tagged commit.
3. Publishes Java, ClojureScript, and Scala.js to Maven Central.
4. Publishes Dart to pub.dev and Gleam to Hex.
5. Downloads and validates the published artifacts with fresh consumers.
6. Builds and publishes the exact npm tarball with provenance.
7. Publishes the GitHub release only after every registry succeeds.

The release is complete only when the entire Release workflow is green. Do not
publish individual packages from a workstation to work around a failed job.

## Recover a partial release

First rerun a failed GitHub Actions job if the failure was transient. Registry
packages are immutable, so do not move the tag or overwrite an existing
version.

Use the Release workflow's manual dispatch with the existing tag only when all
Maven, Dart, and Gleam artifacts were published but npm or the GitHub release
did not finish. The recovery path verifies those artifacts before resuming npm
and GitHub publication.

If published artifacts contain a defect, prepare a new patch release instead
of reusing the version.
