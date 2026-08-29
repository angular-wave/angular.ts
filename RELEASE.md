# Release procedure

AngularTS publishes one version across npm and its maintained language
bindings.

## One-time registry setup

- Add `HEXPM_API_KEY` as a GitHub Actions secret. Use a Hex key with API write
  permission.
- Publish the first Dart `angular_ts` version manually from
  `integrations/dart`. Pub.dev does not allow GitHub OIDC to create a package.
- In the pub.dev package admin page, enable GitHub Actions publishing for
  `angular-wave/angular.ts` with tag pattern `v{{version}}`.

Pub.dev documents the bootstrap and OIDC restriction in its
[automated publishing guide](https://dart.dev/tools/pub/automated-publishing).
Gleam reads `HEXPM_API_KEY` directly when
[publishing to Hex](https://gleam.run/documentation/command-line-reference/).

## Prepare the release

Keep `package.json`, Maven artifacts, Scala.js, Dart, and Gleam on the same
version. Then run:

```bash
make check
make test
make coverage-check
make -C integrations/dart release-check
make -C integrations/gleam release-check
```

The Dart dry run requires a clean checkout. Before commit it may report only
the expected modified-files warning.

## Publish

Push tag `v<version>`. The release workflow:

1. Runs the complete CI workflow.
2. Publishes Java, ClojureScript, and Scala.js to Maven Central.
3. Publishes Dart to pub.dev and Gleam to Hex.
4. Downloads and compiles consumers of every published language package.
5. Publishes npm and the GitHub release only after every registry validates.

The recovery dispatch verifies all five language artifacts before resuming npm
and GitHub publication.
