# AngularTS AssemblyScript Wasm Plan

## Goal

Support AssemblyScript-authored AngularTS applications through the shared Wasm
scope ABI.

AssemblyScript is a direct target for the ABI because it can declare imported
host functions, export allocation/callback functions, and build small browser
Wasm modules without a Rust-style `wasm-bindgen` layer.

## Contract

AssemblyScript targets the shared ABI documented in:

```text
integrations/wasm/ABI.md
```

This plan covers `WasmScope` only. AssemblyScript should use the scope ABI for
view-local controller/component state. App-owned state should use
`app.model(...)` and host-side `model.$sync(...)` targets around an
AssemblyScript runtime; do not add model handles, model path writes, or model
watch imports to the AssemblyScript facade unless the shared ABI adds that
surface later.

The AssemblyScript facade must call the same `angular_ts` imports:

```text
scope_resolve
scope_get
scope_set
scope_delete
scope_sync
scope_watch
scope_unwatch
scope_unbind
buffer_ptr
buffer_len
buffer_free
```

Future directive bindings must use attrs-free link callbacks:
`(scope, element)`, `(scope, element, transclude)`, or
`(scope, element, controller, transclude?)`; attribute helper facades are not part of the public integration API.
compile/template/controller APIs when namespace parity reaches directives.

and export:

```text
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_transaction
```

## Initial Facade Shape

The AssemblyScript package should expose a small typed wrapper:

```ts
export class Scope {
  constructor(handle: u32);

  get<T>(path: string): T;
  set<T>(path: string, value: T): bool;
  delete(path: string): bool;
  sync(): bool;
  watch(path: string, callback: (update: ScopeUpdate) => void): Watch;
  unbind(): bool;
}
```

The first implementation should use JSON-compatible values. Later phases can
add typed handles or binary encodings without changing the base ABI.

## Phases

### Phase A - ABI Package

- [x] Create an AssemblyScript ABI package under `integrations/wasm/assemblyscript`.
- [x] Declare the `angular_ts` host imports.
- [x] Export `ng_abi_alloc` and `ng_abi_free`.
- [x] Add UTF-8 string helpers.
- [x] Add JSON string boundary helpers.
- [x] Add `Scope`, `Watch`, and `ScopeUpdate` wrappers.
- [x] Add AssemblyScript compiler/package wiring and syntax validation.

### Phase B - Todo Proof

- [x] Create an AssemblyScript todo example.
- [x] Use `Scope.setJson` to update real AngularTS scope state.
- [x] Use `Scope.watch` to receive UI-originated scope updates.
- [x] Add a generated or minimal bootstrap that binds `WasmScope`.

### Phase C - Browser Validation

- [x] Add Playwright coverage for the AssemblyScript todo example.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed through the shared `WasmScope` ABI
      callback/result-buffer path.

## Non-Goals

- Reimplement AngularTS in AssemblyScript.
- Introduce AssemblyScript-specific scope sync.
- Introduce AssemblyScript-specific model sync.
- Use `WasmScope` as a substitute for app-owned AngularTS models.
- Depend on event bus for Wasm scope mutation.
- Require `wasm-bindgen`.
