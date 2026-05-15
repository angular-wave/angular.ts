# AngularTS Zig Wasm Plan

## Goal

Support Zig-authored AngularTS applications through the shared Wasm scope ABI.

Zig should target the ABI directly. The Zig package should expose a small typed
facade over imported `angular_ts` host functions and exported allocation and
callback symbols.

## Contract

Zig targets the shared ABI documented in:

```text
integrations/wasm/ABI.md
```

The Zig facade must call the same `angular_ts` imports:

```text
scope_resolve
scope_get
scope_get_named
scope_set
scope_set_named
scope_delete
scope_delete_named
scope_flush
scope_flush_named
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

The Zig package should expose a thin wrapper:

```zig
pub const Scope = struct {
    handle: ?u32 = null,
    name: ?[]const u8 = null,

    pub fn get(self: Scope, allocator: std.mem.Allocator, path: []const u8) ![]u8;
    pub fn set(self: Scope, path: []const u8, json: []const u8) bool;
    pub fn delete(self: Scope, path: []const u8) bool;
    pub fn flush(self: Scope) bool;
    pub fn watch(self: Scope, path: []const u8, callback: WatchCallback) Watch;
    pub fn unbind(self: Scope) bool;
};
```

The first implementation can expose JSON payloads directly. Typed helpers can
be layered over `std.json` after the raw ABI is validated.

## Phases

### Phase A - ABI Module

- [ ] Create a Zig ABI module under `integrations/wasm/zig`.
- [ ] Declare the `angular_ts` host imports.
- [ ] Export `ng_abi_alloc` and `ng_abi_free`.
- [ ] Add UTF-8 pointer/length helpers.
- [ ] Add result-buffer ownership helpers.
- [ ] Add `Scope`, `Watch`, and `ScopeUpdate` wrappers.

### Phase B - Todo Proof

- [ ] Create a Zig todo example.
- [ ] Use `Scope.set` to update real AngularTS scope state.
- [ ] Use `Scope.watch` to receive UI-originated scope updates.
- [ ] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [ ] Add Playwright coverage for the Zig todo example.
- [ ] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [ ] Verify result buffers are freed.

## Non-Goals

- Reimplement AngularTS in Zig.
- Introduce Zig-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require `wasm-bindgen`.
