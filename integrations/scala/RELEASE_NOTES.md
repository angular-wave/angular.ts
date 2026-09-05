# AngularTS Scala.js Facades 0.35.0

Compatible runtime:

- AngularTS npm package: 0.35.0
- Maven coordinate: io.github.angular-wave:angular-ts-scala_sjs1_3

## Scope

- Covers the current public AngularTS `ng` namespace with no planned parity
  entries.
- Provides typed Scala.js facades for module authoring, DI tokens, components,
  directives, app components, app models, router declarations, REST/cache
  policy, realtime transports, service workers, machine/workflow orchestration,
  workflow supervisors, persistence contracts, and worker workflow protocol
  messages.
- Keeps provider-era internals and arbitrary third-party JavaScript objects out
  of the default typed API. Use explicit unsafe interop for unsupported dynamic
  surfaces.

## Release Gate

Before publishing this Scala package, run:

```sh
make check
make release-check
make publish-local
```

Tag releases publish signed binary, source, Scaladoc, and POM artifacts through
the Maven Central Portal after the complete repository CI gate passes.
