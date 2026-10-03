# AngularTS with Go and WebAssembly

Run Go domain logic as WebAssembly while AngularTS owns the page and connects
the guest to a scope.

## Add the binding

This binding is distributed as source. Point the application's `go.mod` at this
module, generate its AngularTS metadata, then compile for `js/wasm`:

```sh
go generate ./...
GOOS=js GOARCH=wasm go build -o main.wasm .
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
```

Load `wasm_exec.js`, initialize the guest, and load its generated AngularTS
bootstrap module from the page.

Keep callback wrappers reachable while AngularTS owns them and release watches
when their scope is destroyed. Batch related updates and keep durable shared
state in AngularTS models.

See `examples/basic_app` for a complete todo project.

## Access shared models

The JavaScript host can lazily retrieve a registered app model with
`angular.getModel(name)` after initialization, then bind that proxy through
`WasmResource.bind(...)` or `scopeAbi.createScope(...)`. Guest code uses the
existing scope handle or binding name to read and update the model. See
[app model access in the shared ABI](../ABI.md#accessing-app-models) for the
startup, identity, error, and cleanup contract.
