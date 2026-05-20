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
bool ng_scope_sync_ref(ng_scope_ref_t scope);
ng_watch_handle_t ng_scope_watch_path(ng_scope_ref_t scope, ng_bytes_t path);
bool ng_scope_unbind_ref(ng_scope_ref_t scope);
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

### Phase B - Todo Proof

- [x] Create a C todo example.
- [x] Use `ng_scope_set_json` to update real AngularTS scope state.
- [x] Use `ng_scope_watch_path` to receive UI-originated scope updates.
- [x] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [x] Add Playwright coverage for the C todo example.
- [x] Add a `wasm-build` target that emits `examples/todo/main.wasm`.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed.

Local `make browser-test` is blocked in the current sandbox because the shared
Playwright web server cannot bind local TCP/UDP sockets. The target builds the
C Wasm artifact before reaching that environment failure. Set
`PW_SKIP_WEB_SERVER=1` to run against an already-running `PW_BASE_URL`.

## Non-Goals

- Reimplement AngularTS in C.
- Introduce C-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Require Emscripten-specific JavaScript glue for the core ABI.
