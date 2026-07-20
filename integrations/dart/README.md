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

## Generated And Handwritten APIs

The package has two Dart API layers:

- `lib/src/generated/ng_facades.dart` is generated from
  `@types/namespace.d.ts`. It contains deterministic raw JavaScript facades for
  public `ng` namespace types.
- Handwritten files under `lib/src/` expose the Dart-facing API: typed tokens,
  value objects, builders, config objects, and curated wrappers that convert
  Dart values at JavaScript boundaries.

Generated facades are intentionally thin and broad. Handwritten APIs remain the
place for Dart-native types, ergonomic return values, and runtime conversion.
When a handwritten wrapper can safely reuse generated raw access, it extends the
generated facade and keeps only the curated members in handwritten code.
`make check` enforces this split: wrappers must use generated bases when one is
available, and every explicit manual override must have a handwritten Dart
member. Type overrides in `tool/generator-overrides.json` are reserved for
stable platform mappings such as DOM and stream types from `package:web`; parity
checks reject stale type overrides.

## WASM Scope And App Models

Generated `WasmScope` facades, when enabled, represent the view-scope ABI only.
They should be used for DOM/root-scoped controller or component state. App-owned
state belongs to `app.model(...)`; durable or shared state should synchronize
with external runtimes through host-side AngularTS services or
`model.$sync(...)` targets. Dart wrappers should not add model handles or model
watch imports unless the shared WASM ABI adds that surface.

Regenerate raw facades after public namespace type changes:

```sh
make generate
```

Check generated freshness:

```sh
make generate-check
```

See [COVERAGE.md](COVERAGE.md) for the current AngularTS API coverage and
[NG_NAMESPACE_PARITY.md](NG_NAMESPACE_PARITY.md) for the public `ng` namespace
type parity checklist.

## Checks

Run the complete Dart integration contract:

```sh
make check
```

That verifies generated bindings are fresh, Dart analysis is clean, Chrome
tests pass, `ng` namespace type and member parity are current, manual override
metadata matches handwritten members, wrappers use generated bases when
available, and the demo compiles and runs against the repository `dist`
runtime.

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
