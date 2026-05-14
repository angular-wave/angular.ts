# AngularTS Dart Integration

This package is the official Dart Web facade for authoring AngularTS
applications from Dart.

The integration is strict by default:

- Dependency injection uses typed `Token<T>` values.
- Factory helpers `inject0` through `inject8` preserve dependency types.
- Runtime config uses typed Dart objects before crossing into JavaScript.
- Dynamic interop is isolated under explicit unsafe APIs.

This package is currently in early implementation and is published separately
from the npm runtime.

See [COVERAGE.md](COVERAGE.md) for the current AngularTS API coverage and
[NG_NAMESPACE_PARITY.md](NG_NAMESPACE_PARITY.md) for the public `ng` namespace
type parity checklist.

## Local Demo

Build the Dart example:

```sh
make example-build
```

For a full runtime smoke test, build and test against the repository `dist`
artifact:

```sh
make runtime-test
```

Start the repository static server from the repo root:

```sh
make serve
```

Open:

```text
http://localhost:4000/integrations/dart/example/basic_app/
```
