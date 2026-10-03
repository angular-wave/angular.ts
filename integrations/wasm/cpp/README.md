# AngularTS with C++ and WebAssembly

Run C++ domain logic as WebAssembly with typed scope access and RAII cleanup.
AngularTS owns the page and connects the guest to a scope.

## Add the binding

This binding is distributed as source and is header-only. Add `include` to the
compiler search path, include `angular_ts/wasm.hpp`, and compile the guest for
`wasm32-wasi` without an entry point.

The JavaScript host loads the module with `app.wasm(...)`, binds a scope, and
calls the exported feature functions. See `examples/todo/bootstrap.js` for the
complete lifecycle.

Use `Scope`, `Watch`, and owned result wrappers instead of raw handles. Keep
browser objects out of guest state, group related writes in one transaction,
and synchronize durable state through AngularTS models.

See `examples/todo` for the C++ source, linker exports, host adapter, and page.

## Access shared models

The JavaScript host can lazily retrieve a registered app model with
`angular.getModel(name)` after initialization, then bind that proxy through
`WasmResource.bind(...)` or `scopeAbi.createScope(...)`. Guest code uses the
existing scope handle or binding name to read and update the model. See
[app model access in the shared ABI](../ABI.md#accessing-app-models) for the
startup, identity, error, and cleanup contract.
