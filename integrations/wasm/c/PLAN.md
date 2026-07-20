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
scope_set
scope_apply
scope_get_binary
scope_set_binary
scope_delete
scope_sync
scope_watch
scope_unwatch
scope_unbind
buffer_ptr
buffer_len
buffer_free
error_code
error_clear
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

## Public Header Shape

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
} ng_scope_ref_t;

bool ng_scope_read_json(ng_scope_ref_t scope, ng_field_t field,
                        ng_result_t *result);
bool ng_update_commit(ng_update_t *update, ng_write_options_t options);
bool ng_scope_observe(ng_scope_ref_t scope, ng_field_t field,
                      ng_watch_options_t options, void *context,
                      ng_scope_observer_t callback, ng_watch_t *watch);
```

The C layer should not own a JSON library. It should operate on JSON byte
ranges and let applications choose their parser.

## Phases

### Phase A - ABI Header

- [x] Create C headers under `integrations/wasm/c`.
- [x] Declare the `angular_ts` host imports.
- [x] Export `ng_abi_alloc` and `ng_abi_free`.
- [x] Add byte-slice and handle types.
- [x] Add helper functions for handle and name-targeted scopes.
- [x] Add result-buffer ownership helpers.
- [x] Generate distinct typed field descriptors from shared contracts.
- [x] Surface local validation failures through the shared ABI error codes.

### Phase B - Todo Proof

- [x] Create a C todo example.
- [x] Commit related scope fields through one caller-buffered transaction.
- [x] Receive UI-originated updates through a scoped observer callback.
- [x] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [x] Add Playwright coverage for the C todo example.
- [x] Add a `wasm-build` target that emits `examples/todo/main.wasm`.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed.

### Phase D - Ergonomic Facade

- [x] Add typed fields without introducing a C JSON dependency.
- [x] Add owned JSON and binary read results.
- [x] Add allocation-free atomic update construction.
- [x] Add per-watch context, routing, initial delivery, and cancellation.
- [x] Remove transaction parsing and global callback state from the todo app.
- [x] Cover failure codes, ownership, transaction encoding, and watch lifecycle.

## Non-Goals

- Reimplement AngularTS in C.
- Introduce C-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require Emscripten-specific JavaScript glue for the core ABI.
