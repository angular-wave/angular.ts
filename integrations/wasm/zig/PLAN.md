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
    pub fn sync(self: Scope) bool;
    pub fn watch(self: Scope, path: []const u8, callback: WatchCallback) Watch;
    pub fn unbind(self: Scope) bool;
};
```

The first implementation can expose JSON payloads directly. Typed helpers can
be layered over `std.json` after the raw ABI is validated.

## Phases

### Phase A - ABI Module

- [x] Create a Zig ABI module under `integrations/wasm/zig`.
- [x] Declare the `angular_ts` host imports.
- [x] Export `ng_abi_alloc` and `ng_abi_free`.
- [x] Add UTF-8 pointer/length helpers.
- [x] Add result-buffer ownership helpers.
- [x] Add `Scope`, `Watch`, and `ScopeUpdate` wrappers.

### Phase B - Todo Proof

- [x] Create a Zig todo example.
- [x] Use `Scope.set` to update real AngularTS scope state.
- [x] Use `Scope.watch` to receive UI-originated scope updates.
- [x] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [x] Add Playwright coverage for the Zig todo example.
- [x] Add a `wasm-build` target that emits `examples/todo/main.wasm`.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed.

Local `make browser-test` is blocked in the current sandbox because the shared
Playwright web server cannot bind local TCP/UDP sockets. The target builds the
Zig Wasm artifact before reaching that environment failure. Set
`PW_SKIP_WEB_SERVER=1` to run against an already-running `PW_BASE_URL`.

## Non-Goals

- Reimplement AngularTS in Zig.
- Introduce Zig-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require `wasm-bindgen`.
