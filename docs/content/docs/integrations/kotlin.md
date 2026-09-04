---
title: 'Kotlin/JS'
weight: 50
description:
  'Build a Kotlin/JS application against generated AngularTS facades, typed
  helpers, production webpack output, and one external browser runtime.'
---

The Kotlin integration provides generated namespace facades plus handwritten
ergonomic wrappers. Kotlin/JS produces the application bundle; AngularTS is the
browser runtime that bundle calls.

## Set up an application

Use the root `integrations/kotlin/build.gradle.kts` as the library definition
and `examples/basic_app` as the application template. Add the integration to the
Kotlin/JS source set, register an AngularTS module, and load the AngularTS
runtime before the Kotlin production bundle.

Build the reference application and browser contract with:

```bash
make -C integrations/kotlin check
make -C integrations/kotlin example-build
make -C integrations/kotlin runtime-test
```

Use `make -C integrations/kotlin publish-local` when another local Gradle build
must consume the integration as a package.

## Best practices

- Import package-level HTML factories such as `button()` instead of passing
  fixed names to `view.tag()`.

- Prefer handwritten typed builders over raw dynamic JavaScript access.
- Keep generated facades isolated and regenerate them from root declarations.
- Use typed injection tokens and explicit dependency order.
- Compile production webpack output in CI, not only Kotlin unit tests.
- Load exactly one AngularTS runtime and keep its version aligned with bindings.
- Use unsafe interop only for a deliberately dynamic public contract.

## Executable evidence

The maintained example or acceptance test is
\`integrations/kotlin/examples/basic_app\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
