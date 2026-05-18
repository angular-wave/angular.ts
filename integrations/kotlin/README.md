# AngularTS Kotlin Integration

This package is the planned Kotlin/JS facade for authoring AngularTS
applications.

The integration is intentionally strict by default:

- dependency injection will use typed tokens;
- handwritten public APIs will avoid raw `dynamic`;
- low-level JavaScript interop will live under `angular.ts.unsafe`;
- namespace parity is checked against `@types/namespace.d.ts`.

The current implementation is a skeleton with namespace parity gates. Runtime
wrappers, generated facades, examples, and browser runtime tests are tracked in
`PLAN.md`.

## Local Checks

```sh
make check
```

The Kotlin package uses the locally installed Gradle by default. Override it
with `GRADLE=/path/to/gradle` if needed.
