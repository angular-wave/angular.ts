# AngularTS Zig Wasm Binding

This package is the Zig binding for the shared AngularTS `WasmScope` ABI.

The binding provides:

- `angular_ts` host import declarations for the shared scope ABI.
- `ng_abi_version`, `ng_abi_alloc`, and `ng_abi_free` guest exports.
- `ng_scope_on_bind`, `ng_scope_on_unbind`, and `ng_scope_on_transaction`
  lifecycle exports.
- `Scope`, `Watch`, `Update`, and `Transaction` wrappers over raw handles and
  UTF-8 byte ranges.
- Typed `Field(T)` and `BinaryField` contracts for scope reads, writes,
  watches, deletes, and update decoding.
- Zig error unions mapped from the shared ABI's machine-readable error codes.
- Typed atomic updates through `Field.set` and `Scope.update`.
- Scope/path-specific observers with explicit instance context and watch-owned
  cleanup.

Normal application code does not handle protocol JSON. `Scope.get` returns an
owned `ReadResult(T)`, `Scope.set` serializes the field's Zig value type, and
`Scope.update` serializes typed field assignments. Raw protocol access remains
available through the explicit `getJson`, `setJson`, and `applyJson` methods.

```zig
const angular = @import("angular-ts");
const player = @import("player-contract");

const scope = try angular.Scope.resolve("player:main");

var name = try scope.get(player.name);
defer name.deinit();

try scope.set(player.health, 100);

var watch = try scope.watch(player.name);
defer watch.deinit();

try scope.update(.{
    player.health.set(100),
    player.name.set("Ada"),
});
```

`ReadResult(T)` owns decoded strings, slices, and nested values until
`deinit()`. This prevents decoded values from borrowing the temporary host
result buffer. `getWithAllocator` and `Update.decodeWithAllocator`
remain available when an application needs allocator control.

`Scope.observe(field, context, callback)` routes only matching scope and path
values to that application instance. Its callback receives `?T`: a value for a
set and `null` for deletion. `observeUpdates` exposes the complete `Update` when
metadata, synchronization `origin`, or manual decoding is required. Calling
`Watch.deinit()` removes the host watch and its Zig observer registration
together. Low-level lifecycle callback setters remain available for code that
implements its own dispatcher.

Generated contracts carry the path and value type together. A generated field
such as `angular.Field(u32).init("health")` cannot accidentally be passed a
string value. `Field.set` creates a typed assignment for an atomic
`Scope.update`; byte fields use `BinaryField` and the binary ABI channel.

`examples/todo` is a minimal todo proof that keeps Zig state authoritative,
exports small command functions, receives the form value through a typed watch,
and publishes its complete view state through one typed transaction. Its
`bootstrap.js` file only binds the AngularTS `WasmScope` and routes UI commands;
it does not allocate guest memory or marshal strings manually.

## Scope ABI And App Models

Zig `Scope` is a thin wrapper over the shared `WasmScope` ABI and should remain
view-scope focused. Use it when a Zig module is backing one AngularTS
controller, component, or directive scope.

App-owned state should stay in AngularTS models. If a Zig runtime needs durable
or shared state, wrap the runtime with an AngularTS service or
`model.$sync(...)` target and pass plain snapshots across that boundary. Do not
add model handles or model watch imports to this binding until the shared ABI
adds a model surface.

## Parity Scope

Zig currently exposes the shared `WasmScope` ABI surface only. It does not
publish AngularTS `ng` namespace service or authoring types, so the Rust/Go
namespace parity checklist does not apply to this binding yet.

## Checks

```sh
make check
```

`make check` runs `zig fmt`, native facade and generated-contract tests, a
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
