# AngularTS C Wasm Binding

This package is the C binding for the shared AngularTS `WasmScope` ABI.

Phase A provides:

- `include/angular_ts_wasm.h` as the public C header.
- `src/angular_ts_wasm.c` as the low-level implementation.
- Raw handle, byte-slice, scope reference, and update payload types.
- `angular_ts` host import declarations with wasm import attributes.
- `ng_abi_alloc`, `ng_abi_free`, and scope lifecycle guest exports.
- Helpers for handle-targeted and name-targeted `Scope` operations.
- Result-buffer ownership helpers.

The C layer does not include a JSON library. It passes JSON as `ng_bytes_t`
ranges and leaves parsing/serialization to the application.

`examples/todo` is a minimal native-checkable todo proof that keeps C state
authoritative and uses `ng_scope_set_json` plus `ng_scope_watch_path` as the
only AngularTS scope boundary. Its `bootstrap.js` file is the browser adapter
that instantiates the Wasm module, binds an AngularTS `WasmScope`, and routes
UI commands into the exported C functions.

## Parity Scope

C currently exposes the shared `WasmScope` ABI surface only. It does not
publish AngularTS `ng` namespace service or authoring types, so the Rust/Go
namespace parity checklist does not apply to this binding yet.

## Checks

```sh
make check
```

`make check` formats with `clang-format` when available, compiles and runs the
native test harness, and performs a `-fsyntax-only` typecheck.

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
