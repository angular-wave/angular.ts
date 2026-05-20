# AngularTS Kotlin Integration

This package is the Kotlin/JS facade for authoring AngularTS applications.

The integration is intentionally strict by default:

- dependency injection will use typed tokens;
- handwritten public APIs will avoid raw `dynamic`;
- low-level JavaScript interop will live under `angular.ts.unsafe`;
- namespace parity is checked against `@types/namespace.d.ts`.

Generated facades, handwritten runtime wrappers, examples, and browser runtime
tests are tracked in `PLAN.md`.

## Prerequisites

- Node.js matching the repository root toolchain.
- Root npm dependencies installed with `npm ci`.
- JDK 17 or newer for Gradle and Kotlin/JS.
- The checked-in Gradle wrapper, used by default through `./gradlew`.
- Playwright browsers installed with `npx playwright install --with-deps` when
  running browser checks locally.

## Local Checks

```sh
make check
```

The Kotlin package uses the checked-in Gradle wrapper by default. Override it
with `GRADLE=/path/to/gradle` if needed.

Useful focused checks:

```sh
make generate-check
make parity
make example-build
make runtime-test
make release-check
make publish-local
```

## Examples

The example projects compile through Kotlin/JS production webpack:

- `examples/basic_app` registers a service, component, directive, and filter.
- `examples/web_components` publishes two AngularTS-backed custom elements.

Run both with:

```sh
make example-build
```

## Unsafe Interop

Safe Kotlin APIs should be preferred for application code. When a public
AngularTS shape is intentionally broad or an integration needs a raw JavaScript
object, use `angular.ts.unsafe.UnsafeInterop` and keep that usage localized.
The parity checks fail on undocumented unsupported namespace entries, so unsafe
interop is an explicit escape hatch rather than hidden coverage.

## Release Checklist

Before listing Kotlin support in release notes:

- regenerate bindings with `make generate`;
- run `make release-check` from `integrations/kotlin`;
- compare Kotlin and Dart parity files for newly introduced public `ng` types;
- review the generated root `dist` changes.

## Manual Publishing

Publishing metadata is configured for Maven publications, but no remote
repository is wired into the build. Verify artifacts locally with:

```sh
make publish-local
```

Add repository credentials only for an explicit release operation.
