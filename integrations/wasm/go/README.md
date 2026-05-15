# AngularTS Go Wasm ABI

This package is the initial standard Go Wasm facade for the language-neutral
AngularTS Wasm scope ABI.

The package does not define a Go-specific scope protocol. It calls the shared
`angular_ts` imports documented in `../ABI.md` and exports the standard guest
allocation and scope callback symbols.

Standard Go Wasm uses `wasm_exec.js` and `syscall/js` for browser startup. The
browser todo proof uses `GoWasmScopeAbi`, a small adapter over host
`WasmScope` objects for callbacks and UI-originated updates, while the
low-level pointer/length facade remains available and build-tested.

The current demo is a proof of concept. The Go feature-complete target is
parity with the Rust/Wasm integration: generated AngularTS registration,
metadata-driven component/controller bridges, typed service facades, namespace
parity tracking, and browser tests for Go-owned state flowing through
`WasmScope`.

## Current Surface

- `Scope` targets a numeric host scope handle.
- `NamedScope` targets a stable AngularTS scope name.
- `Scope.Get` / `NamedScope.Get` decode JSON-compatible scope values.
- `Scope.Set` / `NamedScope.Set` encode JSON-compatible scope values.
- `Delete`, `Flush`, `Unbind`, `Watch`, and `Watch.Unwatch` map to the shared
  host ABI.
- `Update.Decode` decodes watched scope update payloads.
- `GoWasmScopeAbi` adapts standard Go browser Wasm to host `WasmScope` objects.
- `NgModule`, `Component`, `Controller`, `Service`, `Factory`, and `Value`
  capture Go authoring metadata for generated AngularTS glue.
- `InjectionToken`, `Inject`, and `InjectionMetadata` define typed DI metadata.
- `WriteManifestFile` lets app-local `go generate` commands emit AngularTS
  registration metadata.
- `GenerateBootstrap` and `WriteBootstrapFile` emit the browser bootstrap that
  loads `wasm_exec.js`, connects `GoWasmScopeAbi`, registers AngularTS module
  metadata, and starts the Go Wasm app.
- Controller and component metadata can declare a stable Wasm scope name plus
  template-visible field and method names, allowing generated bootstrap to
  carry the scope bridge contract without runtime field or method-list wiring.
- `SyncScope` and generated app-local sync helpers write Go-owned state to
  `WasmScope` fields and flush once per refresh.
- `ScopeWatchRoute`, `TypedWatchRoute`, and `WatchValue` let generated glue
  route UI-originated scope updates into typed Go handlers.
- Generated controller wrappers own the JavaScript export object and refresh
  scope state after bind, template method calls, and watched updates.

See `PLAN.md` for the Rust feature parity checklist.

## Validation

```sh
go generate ./examples/basic_app
go test ./...
GOOS=js GOARCH=wasm go build ./...
make browser-test
```

The browser demo is available at:

```text
http://localhost:4000/integrations/wasm/go/examples/basic_app/
```
