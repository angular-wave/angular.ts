# AngularTS AssemblyScript Wasm Binding

This package is the AssemblyScript binding plan and low-level facade seed for
the shared AngularTS `WasmScope` ABI.

The facade in `src/angular_ts.ts` provides:

- `angular_ts` host import declarations for the shared scope ABI.
- `ng_abi_version`, `ng_abi_alloc`, and `ng_abi_free` guest exports using
  AssemblyScript managed
  `ArrayBuffer` allocations.
- `ng_scope_on_bind`, `ng_scope_on_unbind`, and `ng_scope_on_transaction`
  lifecycle exports.
- `Scope`, `Watch`, and `ScopeUpdate` wrappers over handles and UTF-8
  pointer/length buffers. Result-buffer ownership stays internal.

The facade is intentionally JSON-library agnostic. `Scope.get` returns a result
buffer whose contents can be decoded as JSON text, and `Scope.setJson` accepts
caller-provided JSON strings. Applications can layer typed serializers on top
without changing the shared ABI.

## Scope ABI And App Models

AssemblyScript `Scope` is a thin wrapper over AngularTS `WasmScope`. Use it
for view scopes: controller/component state, watched paths, and values directly
visible to AngularTS templates.

App-owned state belongs to `app.model(...)`. If an AssemblyScript runtime needs
durable or shared state, wrap the runtime with a host-side AngularTS service or
`model.$sync(...)` target and pass plain snapshots across that boundary. Do not
add model handles, model path writes, or model watch imports to this binding
until the shared ABI explicitly adds a model surface.

## Parity Scope

AssemblyScript currently exposes the shared `WasmScope` ABI surface only. It
does not publish AngularTS `ng` namespace service or authoring types, so the
Rust/Go namespace parity checklist does not apply to this binding yet.

## Todo Proof

`examples/todo` is the browser proof for this binding. The AssemblyScript
module owns todo state, writes JSON snapshots into a wrapped AngularTS scope
with `Scope.setJson`, and watches `newTodo` so UI-originated `ng-model`
updates flow back into AssemblyScript.

The JavaScript bootstrap registers a `WasmResource`, binds the controller
scope, and exposes DOM-callable methods such as `add`, `toggle`, and `archive`.

## Checks

```sh
make check
make browser-test
```

`make check` compiles `src/angular_ts.ts`, compiles the todo example, and checks
the JavaScript bootstrap syntax. Temporary facade artifacts are emitted under
`/tmp/angular-ts-assemblyscript`; the todo proof emits
`examples/todo/main.wasm`.

AssemblyScript reports AS235 warnings for exported facade classes because only
functions, variables, and enums become raw Wasm exports. Those classes are
still intentionally exported for AssemblyScript source consumers.
