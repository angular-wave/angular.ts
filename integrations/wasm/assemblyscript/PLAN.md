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

The AssemblyScript facade must call the same `angular_ts` imports:

```text
scope_resolve
scope_get
scope_get_named
scope_set
scope_set_named
scope_delete
scope_delete_named
scope_sync
scope_sync_named
scope_watch
scope_watch_named
scope_unwatch
scope_unbind
scope_unbind_named
buffer_ptr
buffer_len
buffer_free
```

and export:

```text
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_update
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

- [ ] Create an AssemblyScript ABI package under `integrations/wasm/assemblyscript`.
- [ ] Declare the `angular_ts` host imports.
- [ ] Export `ng_abi_alloc` and `ng_abi_free`.
- [ ] Add UTF-8 string helpers.
- [ ] Add JSON encode/decode helpers.
- [ ] Add `Scope`, `Watch`, and `ScopeUpdate` wrappers.

### Phase B - Todo Proof

- [ ] Create an AssemblyScript todo example.
- [ ] Use `Scope.set` to update real AngularTS scope state.
- [ ] Use `Scope.watch` to receive UI-originated scope updates.
- [ ] Add a generated or minimal bootstrap that binds `WasmScope`.

### Phase C - Browser Validation

- [ ] Add Playwright coverage for the AssemblyScript todo example.
- [ ] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [ ] Verify result buffers are freed.

## Non-Goals

- Reimplement AngularTS in AssemblyScript.
- Introduce AssemblyScript-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require `wasm-bindgen`.
