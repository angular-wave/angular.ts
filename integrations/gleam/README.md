# AngularTS Gleam Integration

This package is the official Gleam facade for authoring AngularTS applications.

The integration is strict by default:

- Dependency injection uses typed `Token(a)` values.
- Factory helpers preserve dependency types for the common authoring path.
- Runtime config uses typed Gleam builders before crossing into JavaScript.
- Dynamic interop is isolated under `angular_ts/unsafe`.

This package is in early implementation. Its source contract is the public
TypeScript namespace in `@types/namespace.d.ts`, not another language
integration.

The first slice includes typed tokens, injectable factories, component config
builders, module registration wrappers, bootstrap helpers, and a generated
Gleam namespace inventory.

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
