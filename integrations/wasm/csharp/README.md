# AngularTS with C# and .NET WebAssembly

Run C# domain logic with .NET WebAssembly while AngularTS owns the page and
connects the guest to a scope.

## Requirements

Install .NET 8 and the WebAssembly workload:

```sh
dotnet workload install wasm-tools
```

## Add the binding

This binding is distributed as source. Add a project reference to
`src/AngularTs.Wasm.csproj`, enable `AllowUnsafeBlocks`, and publish the
application for `browser-wasm`:

```sh
dotnet publish -c Release -r browser-wasm
```

The JavaScript host initializes .NET with the AngularTS ABI imports, binds the
scope, and calls methods exported with `JSExport`.

Dispose watches and decoded values deterministically. Keep JavaScript interop in
the adapter, and exchange plain snapshots when durable AngularTS model state
must cross the Wasm boundary.

See `examples/todo` for the project, C# exports, .NET loader, host adapter, and
page.

## Access shared models

The JavaScript host can lazily retrieve a registered app model with
`angular.getModel(name)` after initialization, then bind that proxy through
`WasmResource.bind(...)` or `scopeAbi.createScope(...)`. Guest code uses the
existing scope handle or binding name to read and update the model. See
[app model access in the shared ABI](../ABI.md#accessing-app-models) for the
startup, identity, error, and cleanup contract.
