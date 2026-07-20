# AngularTS C Wasm Binding

This package is the C binding for the shared AngularTS `WasmScope` ABI.

The binding provides:

- `include/angular_ts_wasm.h` as the public C header.
- `src/angular_ts_wasm.c` as the low-level implementation.
- Raw handle and byte-slice ABI functions for low-level integrations.
- Generated, distinct field descriptor types such as `ng_u32_field_t` and
  `ng_binary_field_t`.
- `angular_ts` host import declarations with wasm import attributes.
- `ng_abi_version`, allocation, and scope lifecycle guest exports.
- A `Scope` facade that resolves a stable name once and uses a handle afterward.
- Owned `ng_result_t` reads with one explicit `ng_result_release` operation.
- Caller-buffered `ng_update_t` transactions that commit several field changes
  as one reactive mutation.
- Scoped `ng_watch_t` observers with per-watch context and deterministic
  cancellation.

The C layer does not include a JSON library. It passes JSON as `ng_bytes_t`
ranges and leaves parsing/serialization to the application.

`examples/todo` is a minimal native-checkable todo proof that keeps C state
authoritative. It commits `items`, `remainingCount`, and `newTodo` through one
`ng_update_t`, and observes UI input through one `ng_watch_t`. Its
`bootstrap.js` file instantiates the Wasm module, binds an AngularTS
`WasmScope`, and routes UI commands into the exported C functions.

## Typed fields

Generated contracts expose field descriptors rather than path macros and value
aliases:

```c
static const ng_u32_field_t PLAYER_HEALTH = NG_U32_FIELD("health");
static const ng_binary_field_t PLAYER_FRAME =
    NG_OPTIONAL_BINARY_FIELD("frame");
```

Use `.base` when passing a typed field into the common C facade. Distinct field
types prevent accidental binary/JSON field substitution while preserving a
small implementation surface.

## Ownership and lifetimes

`ng_scope_read_json` and `ng_scope_read_binary` return an `ng_result_t`. Its
`bytes` remain valid until `ng_result_release` is called. Releasing the result
zeros both the handle and byte range.

`ng_update_t` never allocates. The caller owns its buffer and must keep it alive
through `ng_update_commit`. JSON values are copied into that buffer. One update
may contain any number of sets followed by deletes; the commit reaches
AngularTS through one `scope_apply` call.

`ng_scope_observe` stores the field path by reference. Keep the field descriptor
alive until `ng_watch_cancel` or scope unbinding. Generated and `static const`
fields satisfy this naturally. An observer update's `path`, `value_json`, and
`origin_json` ranges are borrowed and valid only for the callback. `origin_json`
is the encoded JSON value, including quotes for string origins. Zero-initialize
`ng_watch_t` before its first use. Builds may override the allocation-free
observer registry size with `NG_WASM_OBSERVER_CAPACITY`.

## Scope ABI And App Models

C exposes the lowest-level `WasmScope` ABI surface. It should stay focused on
view scopes: component/controller state, watched paths, and JSON-compatible
values that are directly visible to AngularTS templates.

App-owned state belongs to `app.model(...)`. When a C Wasm runtime needs to
participate in durable or shared state, wrap it with a host-side AngularTS
service or `model.$sync(...)` target and pass plain snapshots. Do not add model
handles, model path writes, or model watch imports to the C header until the
shared ABI explicitly adds a model surface.

## Parity Scope

C currently exposes the shared `WasmScope` ABI surface only. It does not
publish AngularTS `ng` namespace service or authoring types, so the Rust/Go
namespace parity checklist does not apply to this binding yet.

## Checks

```sh
make check
```

`make check` formats with `clang-format` when available, compiles and runs the
native test harness and todo proof, performs a `-fsyntax-only` typecheck, and
checks the browser adapter syntax.

```sh
make wasm-build
```

`make wasm-build` emits `examples/todo/main.wasm` for the browser todo proof.
It uses Zig's C frontend when available to build a freestanding browser Wasm
module with only the shared `angular_ts` host imports.

```sh
make browser-test
```

`make browser-test` runs the Playwright todo workflow against
`examples/todo/index.html` after building `examples/todo/main.wasm`.

Set `PW_SKIP_WEB_SERVER=1` when `PW_BASE_URL` points at an already-running
server and the Playwright target should not start `make serve`.
