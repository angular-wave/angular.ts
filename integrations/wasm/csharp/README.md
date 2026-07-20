# AngularTS C#/.NET Wasm Binding

This package is the C#/.NET binding plan and low-level facade seed for the
shared AngularTS `WasmScope` ABI.

The facade in `src/AngularTsWasm.cs` provides:

- `angular_ts` host import declarations for the shared scope ABI.
- `ng_abi_version`, `ng_abi_alloc`, and `ng_abi_free` guest exports using
  unmanaged allocations.
- `ng_scope_on_bind`, `ng_scope_on_unbind`, and `ng_scope_on_transaction`
  lifecycle exports.
- `Scope`, `Watch`, and `ScopeUpdate` wrappers over raw handles and UTF-8
  pointer/length buffers. Result-buffer ownership stays internal.
- JSON-compatible `Get<T>` and `Set<T>` helpers over `System.Text.Json`.

`src/AngularTs.Wasm.csproj` is the SDK project file for the facade. A normal
`dotnet build` compiles the binding as a .NET library. Set
`AngularTsWasmBuild=true` to opt into `browser-wasm` runtime packaging when the
.NET WebAssembly workload is installed.

`examples/todo` is the first C# todo proof. It mirrors the other shared-ABI
language demos: the AngularTS controller creates a named `WasmScope`, the C#
module resolves that scope once, uses `Scope.Set(...)` to update template state, and
uses `Scope.Watch(...)` to receive `ng-model` updates from the DOM.

The Playwright harness is already present under `tests/todo_basic.test.ts`.
Running `make ci-check` builds `examples/todo/_framework/dotnet.js` first, then
runs the browser harness without taking the skip path. Running `make
runtime-test` directly still skips when browser output has not been produced,
which keeps the test readable during source-only development.

## Scope ABI And App Models

C# `Scope` is a thin wrapper over AngularTS `WasmScope`. Use it for view
scopes: controller/component state, watched paths, and values directly visible
to AngularTS templates.

App-owned state belongs to `app.model(...)`. If a .NET WebAssembly runtime
needs durable or shared state, wrap the runtime with a host-side AngularTS
service or `model.$sync(...)` target and pass plain snapshots across that
boundary. Do not add model handles, model path writes, or model watch imports
to this binding until the shared ABI explicitly adds a model surface.

## Parity Scope

C# currently exposes the shared `WasmScope` ABI surface only. It does not
publish AngularTS `ng` namespace service or authoring types, so the Rust/Go
namespace parity checklist does not apply to this binding yet.

## Checks

```sh
make check
```

`make check` runs executable source-shape and project-shape checks. When the
.NET SDK is available, the project check also runs:

```sh
dotnet build src/AngularTs.Wasm.csproj --nologo
```

When the SDK is not installed, source-shape checks still run. Full compile and
browser validation are mandatory in `make ci-check`, which is the CI target.

CI provisions .NET 8 and `wasm-tools`, then runs:

```sh
make ci-check
```

That target builds the facade, publishes the todo browser output into
`examples/todo`, and runs the Playwright harness without the skip path.

For local SDK-backed validation without touching system packages, run:

```sh
make local-ci-check
```

That installs the .NET 8 SDK into `integrations/wasm/csharp/.dotnet`, installs
`wasm-tools`, builds the facade and todo output, and runs the browser harness.

If .NET 8 is already installed, use:

```sh
dotnet workload install wasm-tools
make facade-build
make example-build
make runtime-test
```

Run the deferred browser harness with:

```sh
make runtime-test
```
