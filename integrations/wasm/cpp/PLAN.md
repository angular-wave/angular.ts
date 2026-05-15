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
  bool Flush() const;
  Watch WatchPath(std::string_view path, WatchCallback callback) const;
  bool Unbind() const;
};

}
```

Typed helpers can be layered on top with the consumer's preferred JSON library.
The base wrapper should stay JSON-library agnostic.

## Phases

### Phase A - ABI Headers

- [ ] Create C++ headers under `integrations/wasm/cpp`.
- [ ] Declare the `angular_ts` host imports.
- [ ] Export `ng_abi_alloc` and `ng_abi_free`.
- [ ] Add `ResultBuffer` RAII wrapper.
- [ ] Add `Watch` RAII wrapper.
- [ ] Add `Scope` wrapper for handle and name targeting.

### Phase B - Todo Proof

- [ ] Create a C++ todo example.
- [ ] Use `Scope::SetJson` to update real AngularTS scope state.
- [ ] Use `Scope::WatchPath` to receive UI-originated scope updates.
- [ ] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [ ] Add Playwright coverage for the C++ todo example.
- [ ] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [ ] Verify result buffers are freed.

## Non-Goals

- Reimplement AngularTS in C++.
- Introduce C++-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require Emscripten-specific JavaScript glue for the core ABI.
