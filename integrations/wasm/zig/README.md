# AngularTS Zig Wasm Binding

This package is the Zig binding for the shared AngularTS `WasmScope` ABI.

Phase A provides:

- `angular_ts` host import declarations for the shared scope ABI.
- `ng_abi_alloc` and `ng_abi_free` guest exports.
- `ng_scope_on_bind`, `ng_scope_on_unbind`, and `ng_scope_on_update`
  lifecycle exports.
- `Scope`, `Watch`, `ResultBuffer`, `WasmScopeReference`, and
  `WasmScopeUpdate` wrappers over raw handles and UTF-8 byte ranges.

The facade is intentionally JSON-library agnostic. `Scope.get` returns copied
JSON bytes and `Scope.set` accepts caller-owned JSON bytes, so applications can
choose `std.json` helpers or another parser.

`examples/todo` is a minimal todo proof that keeps Zig state authoritative,
exports small command functions, and uses `Scope.set` plus `Scope.watch` as the
only AngularTS scope boundary. Its `bootstrap.js` file is the browser adapter
that instantiates the Wasm module, binds an AngularTS `WasmScope`, and routes
UI commands into the exported Zig functions.

## Parity Scope

Zig currently exposes the shared `WasmScope` ABI surface only. It does not
publish AngularTS `ng` namespace service or authoring types, so the Rust/Go
namespace parity checklist does not apply to this binding yet.

## Checks

```sh
make check
```

`make check` runs `zig fmt`, native `zig build test`, a
`wasm32-freestanding` library typecheck through `zig build wasm-check`, and a
`wasm32-freestanding` todo example typecheck through `zig build example-check`.
It also syntax-checks the JavaScript bootstrap adapter with `node --check`.

```sh
make wasm-build
```

`make wasm-build` emits `examples/todo/main.wasm` for the browser todo proof.
It uses the same shared `angular-ts` Zig module as the typecheck target and
exports the raw ABI entrypoints consumed by `examples/todo/bootstrap.js`.

```sh
make browser-test
```

`make browser-test` runs the Playwright todo workflow against
`examples/todo/index.html` after building `examples/todo/main.wasm`.

Set `PW_SKIP_WEB_SERVER=1` when `PW_BASE_URL` points at an already-running
server and the Playwright target should not start `make serve`.

When the snap launcher is present, the Makefile uses `/snap/zig/current/zig`
directly and stores Zig caches under `/tmp` so checks can run in this sandbox.
