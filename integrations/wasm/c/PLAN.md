# AngularTS C Wasm Plan

## Goal

Support C-authored AngularTS applications through the shared Wasm scope ABI.

C is the lowest-level reference target for the ABI. The C header should define
the raw imports, exports, handle types, pointer/length helpers, and ownership
rules that Zig and C++ can also mirror.

## Contract

C targets the shared ABI documented in:

```text
integrations/wasm/ABI.md
```

The C binding must call the same `angular_ts` imports:

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

## Initial Header Shape

The C package should expose a small header:

```c
typedef uint32_t ng_scope_handle_t;
typedef uint32_t ng_watch_handle_t;
typedef uint32_t ng_buffer_handle_t;

typedef struct {
  const uint8_t *ptr;
  uint32_t len;
} ng_bytes_t;

typedef struct {
  ng_scope_handle_t handle;
  ng_bytes_t name;
} ng_scope_ref_t;

ng_buffer_handle_t ng_scope_get_json(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_set_json(ng_scope_ref_t scope, ng_bytes_t path, ng_bytes_t json);
bool ng_scope_delete_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_flush_ref(ng_scope_ref_t scope);
ng_watch_handle_t ng_scope_watch_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_unbind_ref(ng_scope_ref_t scope);
```

The C layer should not own a JSON library. It should operate on JSON byte
ranges and let applications choose their parser.

## Phases

### Phase A - ABI Header

- [ ] Create C headers under `integrations/wasm/c`.
- [ ] Declare the `angular_ts` host imports.
- [ ] Export `ng_abi_alloc` and `ng_abi_free`.
- [ ] Add byte-slice and handle types.
- [ ] Add helper functions for handle and name-targeted scopes.
- [ ] Add result-buffer ownership helpers.

### Phase B - Todo Proof

- [ ] Create a C todo example.
- [ ] Use `ng_scope_set_json` to update real AngularTS scope state.
- [ ] Use `ng_scope_watch_path` to receive UI-originated scope updates.
- [ ] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [ ] Add Playwright coverage for the C todo example.
- [ ] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [ ] Verify result buffers are freed.

## Non-Goals

- Reimplement AngularTS in C.
- Introduce C-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require Emscripten-specific JavaScript glue for the core ABI.
