# AngularTS Scala.js Facades 0.30.0

Compatible runtime:

- AngularTS npm package: 0.30.0
- Maven coordinates: io.github.angular-ts::angular-ts-scalajs

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

Remote repository credentials are intentionally not configured in this package.
