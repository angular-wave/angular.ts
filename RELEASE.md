# AngularTS releases

AngularTS releases are created from immutable Git tags. A tag is the only
release trigger; npm publishing is not performed from a developer machine.

## One-time repository setup

Configure `@angular-wave/angular.ts` on npm with a GitHub Actions trusted
publisher:

- organization: `angular-wave`
- repository: `angular.ts`
- workflow filename: `release.yml`
- allowed action: `npm publish`

The same configuration can be created without the npm settings UI. npm's
`trust` command requires npm 11.15 or newer and an interactive account session
authenticated with 2FA. A granular token that bypasses 2FA cannot modify trust
settings. Use a temporary npm configuration so an existing automation token in
`~/.npmrc` does not override the interactive session:

```bash
trust_npmrc="$(mktemp)"
trap 'unlink "$trust_npmrc"' EXIT

NPM_CONFIG_USERCONFIG="$trust_npmrc" \
  npx --yes --package npm@11.18.0 npm login --auth-type=web

NPM_CONFIG_USERCONFIG="$trust_npmrc" \
  npx --yes --package npm@11.18.0 npm trust github \
  @angular-wave/angular.ts \
  --repo angular-wave/angular.ts \
  --file release.yml \
  --allow-publish

NPM_CONFIG_USERCONFIG="$trust_npmrc" \
  npx --yes --package npm@11.18.0 npm trust list \
  @angular-wave/angular.ts
```

The workflow uses npm's OIDC trusted publishing and does not require an
`NPM_TOKEN` repository secret. After one successful trusted publication,
disable token-based package publishing in the npm package settings.

Protect tags matching `v*` in the GitHub repository rules so only maintainers
can create release tags and published release tags cannot be moved or deleted.
Enable immutable GitHub Releases for the repository when available.

## Prepare a release commit

Start from a clean `master` branch that is synchronized with `origin/master`:

```bash
git switch master
git pull --ff-only origin master
git status --short
```

1. Update `package.json` and `package-lock.json` without creating a commit or
   tag:

   ```bash
   npm version <new-version> --no-git-tag-version
   ```

2. Confirm that the version recorded in `package.json` has not already been
   published:

   ```bash
   npm view "@angular-wave/angular.ts@$(node -p 'require("./package.json").version')" version
   ```

   npm should report that the version is not present.

3. Add an exact, non-empty version section beneath `Unreleased` in
   `CHANGELOG.md`. Keep the notes terse and limited to user-visible changes:

   ```markdown
   ## [Unreleased]

   ## [x.y.z] - YYYY-MM-DD

   - Added a user-visible capability.
   - Removed an obsolete configuration surface.
   ```

   Do not copy pull-request or commit inventories into the changelog. The
   release workflow extracts this section verbatim for the GitHub Release.

4. Generate and validate the release artifacts:

   ```bash
   make prepare-release
   git diff --check
   git status --short
   ```

   `make prepare-release` validates the release notes and formatting, then
   generates version files, distribution bundles, declarations, documentation,
   integration bindings, and the size report. It does not rerun the test suite;
   the release commit and tag must pass the repository CI gate.

5. Review all changes. The release commit must include the version and
   changelog changes as well as generated declarations, distribution files,
   TypeDoc output, version files, and size output.

6. Commit and push the prepared release:

   ```bash
   git add -A
   git commit -m "Release $(node -p 'require("./package.json").version')"
   git push origin master
   ```

7. Wait for all required checks on the release commit to pass. Do not create
   the release tag from an unverified commit.

## Publish from a tag

Create an annotated tag whose name exactly matches the package version with a
`v` prefix. Create it on the verified release commit, inspect it, and push only
that tag:

```bash
RELEASE_VERSION="$(node -p 'require("./package.json").version')"
RELEASE_TAG="v$RELEASE_VERSION"
git tag -a "$RELEASE_TAG" -m "Version $RELEASE_VERSION"
git show --no-patch "$RELEASE_TAG"
git push origin "$RELEASE_TAG"
```

The `Release` workflow then:

1. Runs the complete CI workflow against the tagged commit.
2. Rejects tags that do not exactly match `package.json` or versions that
   already exist on npm.
3. Rebuilds declarations, distribution files, and documentation and verifies
   that the generated files were committed.
4. Packs one npm tarball and validates its name, version, and warnings.
5. Extracts the tagged version from `CHANGELOG.md` and creates a draft GitHub
   Release with those curated notes and the tarball asset.
6. Publishes that exact tarball to npm using OIDC and provenance.
7. Publishes the GitHub Release only after npm accepts the package.

Stable versions are published under npm's `latest` tag. SemVer prereleases,
such as `x.y.z-beta.1`, are published under `next` and marked as prereleases
on GitHub.

The workflow authenticates to npm through the configured GitHub OIDC trusted
publisher. Do not run `npm publish` locally and do not provide an `NPM_TOKEN`.
Pushing the release commit alone does not publish anything; pushing the matching
version tag is the release trigger.

## Verify the release

After the workflow succeeds, verify npm and the GitHub Release:

```bash
RELEASE_VERSION="$(node -p 'require("./package.json").version')"
npm view "@angular-wave/angular.ts@$RELEASE_VERSION" version dist-tags --json
```

Confirm that GitHub published the matching `v<version>` tag, attached the npm
package tarball, and used the curated `CHANGELOG.md` section as its description.

## Failure handling

Never move or reuse a published release tag. If validation fails before npm
publication, correct the release commit and create a new tag and version when
necessary.

If npm publication succeeds but finalizing the GitHub Release fails, publish
the existing draft release manually. The npm version is immutable and must not
be republished. Any package correction after publication must use a new version,
usually the next patch version.
