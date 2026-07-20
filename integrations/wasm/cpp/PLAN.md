# AngularTS C++ Wasm Plan

## Goal

Support C++-authored AngularTS applications through the shared Wasm scope ABI.

C++ should use the C ABI as the low-level contract and add optional RAII
wrappers for result buffers, watches, and scope references.

## Contract

C++ targets the shared ABI documented in:

```text
integrations/wasm/ABI.md
```

The C++ facade must call the same `angular_ts` imports:

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

The C++ package should expose a low-level header plus RAII helpers:

```cpp
namespace angular_ts {

class Scope {
 public:
  static Scope FromHandle(uint32_t handle);
  static Scope FromName(std::string_view name);

  std::string GetJson(std::string_view path) const;
  bool SetJson(std::string_view path, std::string_view json) const;
  bool Delete(std::string_view path) const;
  bool Sync() const;
  Watch WatchPath(std::string_view path, WatchCallback callback) const;
  bool Unbind() const;
};

}
```

Typed helpers can be layered on top with the consumer's preferred JSON library.
The base wrapper should stay JSON-library agnostic.

## Phases

### Phase A - ABI Headers

- [x] Create C++ headers under `integrations/wasm/cpp`.
- [x] Declare the `angular_ts` host imports.
- [x] Export `ng_abi_alloc` and `ng_abi_free`.
- [x] Add `ResultBuffer` RAII wrapper.
- [x] Add `Watch` RAII wrapper.
- [x] Add `Scope` wrapper for handle and name targeting.

### Phase B - Todo Proof

- [x] Create a C++ todo example.
- [x] Use `Scope::SetJson` to update real AngularTS scope state.
- [x] Use `Scope::WatchPath` to receive UI-originated scope updates.
- [x] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [x] Add Playwright coverage for the C++ todo example.
- [x] Add a `wasm-build` target that emits `examples/todo/main.wasm`.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed.

Local `make browser-test` is blocked in the current sandbox because the shared
Playwright web server cannot bind local TCP/UDP sockets. The target builds the
C++ Wasm artifact before reaching that environment failure. Set
`PW_SKIP_WEB_SERVER=1` to run against an already-running `PW_BASE_URL`.

## Non-Goals

- Reimplement AngularTS in C++.
- Introduce C++-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require Emscripten-specific JavaScript glue for the core ABI.
