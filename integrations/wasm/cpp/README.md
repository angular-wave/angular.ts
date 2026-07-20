# AngularTS C++ Wasm Binding

This package is the C++ binding for the shared AngularTS `WasmScope` ABI.

Phase A provides a header-only facade in `include/angular_ts/wasm.hpp`:

- `angular_ts` host import declarations with wasm import attributes.
- `ng_abi_version`, `ng_abi_alloc`, and `ng_abi_free` guest exports.
- Scope lifecycle exports for bind, unbind, and watched updates.
- `Bytes`, `ScopeRef`, `ScopeUpdate`, `Scope`, `Watch`, and `ResultBuffer`.
- RAII ownership for result buffers and watch handles.

The wrapper stays JSON-library agnostic. `Scope::GetJson` returns a
`std::string`, and `Scope::SetJson` accepts caller-provided JSON.

`examples/todo` is a minimal native-checkable todo proof that keeps C++ state
authoritative and uses `Scope::SetJson` plus `Scope::WatchPath` as the only
AngularTS scope boundary. Its `bootstrap.js` file is the browser adapter that
instantiates the Wasm module, binds an AngularTS `WasmScope`, and routes UI
commands into the exported C++ functions.

## Scope ABI And App Models

C++ `Scope` wraps the shared `WasmScope` ABI for view-scope integration. It is
the right boundary for C++ code that owns a controller/component interaction and
needs to project JSON-compatible values into the DOM.

Do not route app-owned AngularTS model state through C++ scope helpers just to
make it persistent or shared. Use `app.model(...)` and a host-side
`model.$sync(...)` target around the C++ runtime, passing plain snapshots across
that boundary. The C++ binding should not add model handles, model path writes,
or model watch imports unless the shared ABI adds that surface later.

## Parity Scope

C++ currently exposes the shared `WasmScope` ABI surface only. It does not
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
It uses Zig's C++ frontend when available to build a WASI-targeted module with
the shared `angular_ts` host imports. The browser bootstrap provides the small
WASI import shim needed by the C++ standard library runtime.

```sh
make browser-test
```

`make browser-test` runs the Playwright todo workflow against
`examples/todo/index.html` after building `examples/todo/main.wasm`.

Set `PW_SKIP_WEB_SERVER=1` when `PW_BASE_URL` points at an already-running
server and the Playwright target should not start `make serve`.
