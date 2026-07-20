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

1. Choose a version that has not been published to npm.
2. Update `package.json` and `package-lock.json` without creating a tag:

   ```bash
   npm version 0.31.0 --no-git-tag-version
   ```

3. Replace the `Unreleased` heading in `CHANGELOG.md` with the exact version
   and release date, then write a concise description of user-visible changes:

   ```markdown
   ## [0.31.0] - 2026-07-19

   - Added a user-visible capability.
   - Removed an obsolete configuration surface.
   ```

   Add a new `## [Unreleased]` section above it for subsequent work. Do not
   copy pull-request or commit inventories into the changelog.

4. Run the local release preparation gate:

   ```bash
   make prepare-release
   ```

5. Review and commit the version, changelog, generated declarations, distribution files,
   generated documentation, migration guidance, and release-facing changes.
6. Merge the release commit to `master` and require its CI run to pass.

## Publish from a tag

Create an annotated tag whose name exactly matches the package version with a
`v` prefix, then push only that tag:

```bash
git tag -a v0.31.0 -m "AngularTS 0.31.0"
git push origin v0.31.0
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
such as `0.31.0-beta.1`, are published under `next` and marked as prereleases
on GitHub.

## Failure handling

Never move or reuse a release tag. If validation fails before npm publication,
fix the release on a new commit, choose a new version when necessary, and push
a new tag.

If npm publication succeeds but finalizing the GitHub Release fails, publish
the existing draft release manually. The npm version is immutable and must not
be republished.
