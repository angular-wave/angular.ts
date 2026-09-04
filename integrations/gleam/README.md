# AngularTS Gleam Integration

This package is the official Gleam facade for authoring AngularTS applications.

The integration is strict by default:

- Dependency injection uses typed `Token(a)` values.
- Factory helpers preserve dependency types for the common authoring path.
- Runtime config uses typed Gleam builders before crossing into JavaScript.
- Dynamic interop is isolated under `angular_ts/unsafe`.

The package version follows the AngularTS runtime version. Its source contract
is the public TypeScript namespace in `@types/namespace.d.ts`.

Generated opaque namespace types carry the canonical TypeScript descriptions as
Gleam documentation comments. Generated token helpers document the injectable
token they return, and `make generate-check` rejects documentation drift.

The first slice includes typed tokens, injectable factories, component config
builders, module registration wrappers, bootstrap helpers, and a generated
Gleam namespace inventory. The `angular_ts/worker` facade exposes typed worker
configuration, named module registration, managed lifecycle operations,
correlated requests, model synchronization channels, and message/error
subscriptions without requiring application code to call JavaScript methods
through `Dynamic`.

## Programmatic Views

The `angular_ts/programmatic_view` module provides typed callback contexts and
bindings. Import `angular_ts/view_tags` for named HTML factories such as
`view_tags/button`. `component.with_view` and `directive.with_view` wrap the raw
runtime context, while `controller`, `required`, `scope`, `host`, `transclude`,
and `on_destroy` expose its members. Use `event`, `attrs`, `props`, and `each`
for explicit bindings. Reserve `tag` and `tag_ns` for names selected at runtime.

Install the published package with `gleam add angular_ts`.

## Local Checks

```sh
make test
```

Check the Gleam parity inventory against the TypeScript source namespace:

```sh
make parity
```

Regenerate the opaque Gleam namespace inventory and typed injection token
helpers after public TypeScript namespace changes:

```sh
make generate
```

The current workspace does not vendor the Gleam toolchain. Install Gleam before
running the local checks.
