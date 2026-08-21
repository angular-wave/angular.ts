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

Maven Central does not currently provide equivalent trusted publishing. The
Java and ClojureScript publication jobs use the same Central Portal account.
Create a Central Portal user token at <https://central.sonatype.com/usertoken>
and add its generated credentials as these GitHub Actions repository secrets:

- `MAVEN_CENTRAL_USERNAME`
- `MAVEN_CENTRAL_TOKEN`

Create a passphrase-protected primary OpenPGP signing key, publish its public
key to a Maven Central-supported key server, and add these repository secrets:

- `MAVEN_GPG_PRIVATE_KEY`: the complete ASCII-armored output of
  `gpg --armor --export-secret-keys <key-id>`
- `MAVEN_GPG_PASSPHRASE`: the private key passphrase

For example, publish the public key and set the secrets with:

```bash
gpg --keyserver keyserver.ubuntu.com --send-keys <key-id>
gpg --armor --export-secret-keys <key-id> > angular-ts-release-key.asc

gh secret set MAVEN_CENTRAL_USERNAME
gh secret set MAVEN_CENTRAL_TOKEN
gh secret set MAVEN_GPG_PRIVATE_KEY < angular-ts-release-key.asc
gh secret set MAVEN_GPG_PASSPHRASE

rm angular-ts-release-key.asc
```

The verified Central namespace must include `io.github.angular-wave`. Keep the
private key and its passphrase outside the repository; only the public key is
distributed to a key server.

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
make publish-release
```

The command derives the version from `package.json`, requires a clean worktree,
requires `HEAD` to match `origin/master`, creates and displays the annotated
tag, and pushes it to trigger the release workflow.

The `Release` workflow then:

1. Runs the complete CI workflow against the tagged commit.
2. Validates and independently publishes `io.github.angular-wave:angular-ts-java`
   and `io.github.angular-wave:angular-ts-cljs` to Maven Central with main,
   source, documentation, and PGP signature artifacts.
3. Waits until Maven Central reports both artifacts as published.
4. Rejects tags that do not exactly match `package.json` or versions that
   already exist on npm.
5. Rebuilds declarations, distribution files, and documentation and verifies
   that the generated files were committed.
6. Packs one npm tarball and validates its name, version, and warnings.
7. Extracts the tagged version from `CHANGELOG.md` and creates a draft GitHub
   Release with those curated notes and the tarball asset.
8. Publishes that exact tarball to npm using OIDC and provenance.
9. Publishes the GitHub Release only after Maven Central and npm accept their
   packages.

Stable versions are published under npm's `latest` tag. SemVer prereleases,
such as `x.y.z-beta.1`, are published under `next` and marked as prereleases
on GitHub.

The workflow authenticates to npm through the configured GitHub OIDC trusted
publisher. Do not run `npm publish` locally and do not provide an `NPM_TOKEN`.
Pushing the release commit alone does not publish anything; pushing the matching
version tag is the release trigger.

## Verify the release

After the workflow succeeds, verify npm, Maven Central, and the GitHub Release:

```bash
RELEASE_VERSION="$(node -p 'require("./package.json").version')"
npm view "@angular-wave/angular.ts@$RELEASE_VERSION" version dist-tags --json
curl --fail --head \
  "https://repo1.maven.org/maven2/io/github/angular-wave/angular-ts-java/$RELEASE_VERSION/angular-ts-java-$RELEASE_VERSION.pom"
curl --fail --head \
  "https://repo1.maven.org/maven2/io/github/angular-wave/angular-ts-cljs/$RELEASE_VERSION/angular-ts-cljs-$RELEASE_VERSION.pom"
```

Confirm that GitHub published the matching `v<version>` tag, attached the npm
package tarball, and used the curated `CHANGELOG.md` section as its description.

## Failure handling

Never move or reuse a published release tag. Maven Central and npm packages are
immutable. If validation fails before either publication, correct the release
commit and create a new tag and version when necessary.

If one Maven Central publication succeeds and the other fails, rerun only the
failed Maven job and its dependent jobs. If both Maven publications succeed but
npm publication fails, rerun only the failed and dependent workflow jobs after
correcting transient configuration.
If npm publication succeeds but finalizing the GitHub Release fails, publish
the existing draft release manually. Any package correction after publication
must use a new version, usually the next patch version.
