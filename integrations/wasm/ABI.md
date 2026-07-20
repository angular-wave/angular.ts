# AngularTS Wasm Scope ABI

## Purpose

The AngularTS Wasm scope ABI is the language-neutral contract used by Wasm
clients to read, write, watch, and release AngularTS scopes.

This ABI is intentionally independent from scope sync, event bus, server state
sync, DOM hydration, and any one language integration. Rust, Go,
AssemblyScript, C#, Zig, C++, C, and other Wasm producers should be able to
target the same contract.

`WasmScope` is the host boundary type. It wraps a real AngularTS scope and
mutates that scope directly through the standard scope traps. UI updates caused
by Wasm writes flow through normal AngularTS scope behavior. UI updates observed
by AngularTS can call back into Wasm through exported ABI callbacks.

This document describes the low-level reactive-target ABI. The app-facing
`WasmResource.bind(...)` operation accepts both root/view scopes and app-owned
models. Binding authors see the same scope-shaped ABI for either target.

Initial rule:

- use `WasmScope` for DOM/root-scoped view state and explicit scope bindings;
- use `app.model(...)` plus `$sync()` for app-owned state that should survive
  root destruction, coordinate multiple roots, or synchronize with workers,
  engines, storage, machines, workflows, or network services;
- keep large WASM-owned buffers and hot-loop state inside WASM, and expose only
  semantic snapshots or control state to AngularTS models.

## Encoding

All cross-boundary strings are UTF-8 byte ranges in guest linear memory:

```text
ptr: u32
len: u32
```

All generic values are JSON encoded into UTF-8 buffers for the initial ABI.
Language bindings may provide typed helpers over that JSON layer.

The raw ABI remains pointer, length, numeric handles, and integer status codes.
A guest may resolve a stable name once, then uses the returned numeric handle
for every operation.

## Handles

The host owns all AngularTS handles. A guest facade may construct a reference
from a numeric handle or resolve a stable name into one.

```text
scopeHandle: host-owned handle for one WasmScope
scopeName: UTF-8 scope name, usually matching ng-scope / $scopename
watchHandle: host-owned handle for one registered watch
bufferHandle: host-owned handle for one result buffer
```

Numeric handles are process-local and are not stable across page reloads or
Wasm module instances. Scope names are stable only within the application scope
tree and must be unique when used as direct ABI targets.

## Guest Exports

The Wasm module must export allocation functions whenever it wants to use the
scope ABI. AngularTS uses those functions to place callback payloads and
host-returned result buffers into guest memory.

```ts
interface WasmAbiExports {
  memory: Pick<WebAssembly.Memory, "buffer">;

  ng_abi_version(): number;
  ng_abi_alloc(size: number): number;
  ng_abi_free(ptr: number, size: number): void;

  ng_scope_on_bind?(
    scopeHandle: number,
    namePtr: number,
    nameLen: number,
  ): void;

  ng_scope_on_unbind?(scopeHandle: number): void;

  ng_scope_on_transaction?(
    scopeHandle: number,
    transactionPtr: number,
    transactionLen: number,
  ): void;
}
```

The memory export is capability-based: native modules normally provide a
`WebAssembly.Memory`, while managed runtimes may provide a live object whose
`buffer` getter returns the current linear-memory buffer. AngularTS does not
require the concrete `WebAssembly.Memory` class because the ABI only reads and
writes its buffer.

### `ng_abi_version`

Returns the integer ABI version implemented by the guest. Version `3` is the
current contract. AngularTS rejects a missing, non-integer, or mismatched
version before creating any reactive binding. The version identifies the ABI;
it does not select a compatibility implementation.

### `ng_abi_alloc`

Allocates `size` bytes in guest memory and returns the pointer.

AngularTS calls this before writing a string or JSON payload into guest memory.
Returning `0` is reserved for allocation failure.

### `ng_abi_free`

Releases a guest allocation previously returned by `ng_abi_alloc`.

AngularTS calls this after one-shot callback payloads have been delivered. Guest
code calls `buffer_free` for host-owned result buffers; the host then calls
`ng_abi_free` internally.

## Boundary Validation

AngularTS validates every guest pointer and length against current linear
memory before decoding it. Scope names and paths are limited to 16 KiB;
string and JSON payloads are limited to 16 MiB. Allocator results are checked
against the same memory bounds. Invalid UTF-8 ranges, malformed JSON, excessive
lengths, and invalid pointers return the import's normal failure value (`0`)
instead of throwing through the host application.

One ABI instance owns at most 1,024 live scopes, 4,096 live watches, 1,024
unreleased result buffers, 64 MiB of result-buffer data, and 32 nested guest
callbacks. These aggregate budgets prevent individually valid operations from
exhausting the host. Releasing a watch, scope, or buffer immediately restores
its capacity.

Guest lifecycle callback traps are different from malformed import arguments:
the failed binding is disposed and the error is reported through AngularTS
application error handling.

## Conformance

`integrations/wasm/abi-conformance.ts` is the executable browser contract used
by the Rust, Go, AssemblyScript, C#, Zig, C++, and C examples. Against each real
guest it verifies ABI version 3, writable in-range allocations where the
browser runtime exposes the guest allocator, malformed host calls returning
failure values, malformed ranges and UTF-8 containment, and stable buffer,
scope, and watch registry counts.

Standard Go's `wasm_exec.js` browser path cannot export the portable package's
`//export` allocator functions. Its browser probe therefore declares guest
allocation unavailable and runs the remaining conformance checks through
`GoWasmScopeAbi`; the Go package's native tests separately cover
`ng_abi_alloc` and `ng_abi_free`. This is an explicit toolchain capability, not
an alternate ABI version.

### `ng_scope_on_bind`

Optional lifecycle callback invoked after a host scope has been bound.

The callback receives:

```text
scopeHandle
scopeName UTF-8 range
```

### `ng_scope_on_unbind`

Optional lifecycle callback invoked before a host scope handle is unbound.

### `ng_scope_on_transaction`

Optional callback invoked once per microtask when AngularTS observes one or
more watched scope paths. Updates to the same path are coalesced to their final
value before the callback. This preserves one atomic reactive change across the
host/guest boundary instead of exposing partially updated state.

The callback receives:

```text
scopeHandle
transaction JSON UTF-8 range
```

The transaction has the same shape accepted by `scope_apply`:

```json
{
  "set": { "player.score": 12 },
  "delete": ["player.pendingMove"],
  "origin": "dom"
}
```

## Host Imports

AngularTS exposes the ABI imports under the `angular_ts` import namespace.

```ts
{
  angular_ts: {
    scope_resolve(namePtr, nameLen): scopeHandle;

    scope_get(scopeHandle, pathPtr, pathLen): bufferHandle;

    scope_set(scopeHandle, pathPtr, pathLen, valuePtr, valueLen): 0 | 1;

    scope_apply(scopeHandle, transactionPtr, transactionLen): 0 | 1;

    scope_get_binary(scopeHandle, pathPtr, pathLen): bufferHandle;
    scope_set_binary(
      scopeHandle,
      pathPtr,
      pathLen,
      valuePtr,
      valueLen,
      optionsPtr,
      optionsLen,
    ): 0 | 1;

    scope_delete(scopeHandle, pathPtr, pathLen): 0 | 1;

    scope_sync(scopeHandle): 0 | 1;

    scope_watch(scopeHandle, pathPtr, pathLen): watchHandle;
    scope_unwatch(watchHandle): 0 | 1;

    scope_unbind(scopeHandle): 0 | 1;

    buffer_ptr(bufferHandle): ptr;
    buffer_len(bufferHandle): len;
    buffer_free(bufferHandle): void;

    error_code(): number;
    error_clear(): void;
  }
}
```

### `scope_resolve`

Resolves a UTF-8 scope name to a numeric `scopeHandle`.

This is useful when guest code wants to use the shorter numeric imports after
initial lookup. Returns `0` when no scope is registered under that name.

### `scope_get`

Reads a dot-separated path from a bound AngularTS scope and returns a
host-owned `bufferHandle` containing a JSON payload.

The guest must call:

```text
ptr = buffer_ptr(bufferHandle)
len = buffer_len(bufferHandle)
buffer_free(bufferHandle)
```

after it has copied or decoded the result.

### `scope_set`

Writes a JSON payload into a dot-separated path on a bound AngularTS scope.

Returns `1` on success and `0` when the scope handle or path is invalid.

### `scope_apply`

Applies one validated JSON transaction as a single reactive batch:

```json
{
  "set": { "position.x": 12, "position.y": 8 },
  "delete": ["staleTarget"],
  "origin": "guest:physics",
  "echo": false
}
```

`set` and `delete` paths must be safe, non-empty, and non-overlapping. The
transaction is validated before mutation. App-context models are restored once
with the supplied origin, so model schedulers and `$sync()` targets observe one
coherent change. `echo` defaults to `false` for guest transactions; set it to
`true` only when the writing guest also needs its watch callback.

### Binary channel

`scope_get_binary` and `scope_set_binary` transfer bytes without base64 or JSON
arrays. Reads return the same owned result-buffer handle used by `scope_get`.
Writes store an owned `Uint8Array` copy on the reactive target. The final two
arguments to `scope_set_binary` point to optional JSON `{ "origin", "echo" }`
options; a zero-length options range uses origin `wasm` and disables echo.

### `scope_delete`

Deletes a dot-separated path from a bound AngularTS scope.

Returns `1` on success and `0` when the scope handle or path is invalid.

### `scope_sync`

Runs queued Wasm scope bridge callbacks for the bound scope.

Returns `1` on success and `0` when the scope handle is invalid.

### `scope_watch`

Registers an AngularTS watcher for a dot-separated scope path.

Returns a host-owned `watchHandle`. When the path changes, AngularTS invokes
the guest `ng_scope_on_transaction` export if it exists. Multiple watched path
changes in one microtask are delivered together.

### `scope_unwatch`

Removes a previously registered `watchHandle`.

Returns `1` when a watch was removed and `0` when the handle was unknown.

### `scope_unbind`

Unbinds the host `WasmScope` handle without destroying the AngularTS scope.

Returns `1` when a scope was unbound and `0` when the handle was unknown.

### `buffer_ptr`

Returns the guest pointer for a host-owned result buffer.

### `buffer_len`

Returns the byte length for a host-owned result buffer.

### `buffer_free`

Releases a host-owned result buffer and the underlying guest-memory allocation.

Every non-zero `bufferHandle` returned from `scope_get` or `scope_get_binary`
must be released exactly once.

### Guest failure codes

Imports return their ordinary failure value and record one last-error code:

| Code | Meaning |
| ---: | --- |
| 0 | no failure |
| 1 | ABI disposed |
| 2 | invalid handle |
| 3 | invalid pointer or memory range |
| 4 | invalid or over-limit length |
| 5 | invalid JSON |
| 6 | unsafe scope path |
| 7 | resource limit exceeded |
| 8 | invalid transaction or options |
| 9 | value is not binary |
| 10 | operation failed |

Call `error_code()` immediately after a failed import. Every subsequent guarded
import replaces the code; `error_clear()` resets it explicitly.

## Memory Ownership

Guest-owned allocation:

```text
guest calls ng_abi_alloc
guest passes ptr/len into host import
guest frees its own allocation when no longer needed
```

Host-owned result buffer:

```text
host calls ng_abi_alloc
host writes result JSON into guest memory
host returns bufferHandle
guest reads ptr/len through buffer_ptr/buffer_len
guest calls buffer_free
host calls ng_abi_free
```

Host-to-guest callback payload:

```text
host calls ng_abi_alloc
host invokes guest callback
host calls ng_abi_free after the callback returns
```

Guest callbacks must copy data they need to keep after returning.

## Scope Semantics

`WasmScope` mutates real AngularTS scopes directly.

The ABI does not:

- publish patches onto the event bus;
- merge remote objects into named scopes;
- hydrate a server-rendered DOM;
- define a transport protocol;
- require `wasm-bindgen`.

Language integrations may wrap this ABI with idiomatic APIs, but those wrappers
must preserve the direct scope-boundary semantics.

## Scope ABI Versus App Models

`WasmScope` remains the correct boundary when the Wasm module is implementing a
component, controller, directive, or view-local interaction. In that case the
Wasm code is intentionally writing a real AngularTS scope and receiving watched
scope updates from the DOM.

App-owned state should not be pushed through the scope ABI only to make it
durable or shared. Use `app.model(...)` and a host-side `$sync()` target when
state must:

- survive root scope destruction;
- be shared by multiple roots in one `AppContext`;
- synchronize with storage, workers, game engines, CRDT documents, machines,
  workflows, or network services;
- cross a runtime boundary as a plain snapshot rather than as scope paths.

Current model synchronization is host-side JavaScript. No model-specific Wasm
ABI imports are added yet. A Wasm runtime that needs to participate in model
sync should be wrapped by an AngularTS service or sync target:

```js
app.model("database", () => ({
  rows: [],
  selected: null,
}));

app.service("sqliteSyncTarget", class {
  write(snapshot, change) {
    // Persist or transfer a plain model snapshot to the Wasm-owned runtime.
  }
});

app.controller("DatabaseCtrl", class {
  static $inject = ["database", "sqliteSyncTarget", "$scope"];

  constructor(database, sqliteSyncTarget, $scope) {
    this.database = database;
    const stopSync = database.$sync(sqliteSyncTarget);

    $scope.$on("$destroy", stopSync);
  }
});
```

AngularTS validates this host boundary. A `$sync()` target must expose at least
one recognized lifecycle operation, every supplied operation must be callable,
and restored or received model snapshots must be plain objects. Invalid guest
payloads follow the target's model sync failure policy and cannot partially
replace the live model. The host adapter remains responsible for validating
the domain fields inside an otherwise valid plain snapshot before applying it.

Do not add model handles, model path writes, or model watch imports to the raw
ABI until repeated host-side adapters fail to cover real integrations. The
current validation examples are:

- SQLite WASM: model snapshots are plain JSON data persisted into a WASM-owned
  database runtime through `$snapshot()` and `$sync()`.
- Unity WebGL: runtime bridge events update an app model, then `$sync()` emits
  a plain player snapshot to an injectable telemetry target.

Inbound runtime updates should apply snapshots through `$restore(snapshot, {
origin })` from the host-side target so echo prevention stays in AngularTS
model sync rather than in each Wasm language facade.

## TypeScript ABI Namespace

Language and runtime binding authors should import the low-level ABI from the
Wasm service subpath:

```ts
import { WasmAbi } from "@angular-wave/angular.ts/services/wasm";

const abi = WasmAbi.create();
```

`WasmAbi.create()` is the only public runtime ABI factory. Host scopes are
created through `abi.createScope(...)`; callers do not construct them directly.
The ABI always starts detached: instantiate the guest with `abi.imports`, then
call `abi.attach(instance.exports)` before binding scopes. Constructor injection
is not a second initialization mode. `attach(...)` accepts the native browser
exports object and validates the required AngularTS ABI exports immediately.
`createScope(...)` rejects destroyed targets and requires each active scope name
to be non-empty and unique within that ABI instance.
Scope names are selected only by `createScope(...)`; `bind(...)` accepts watch
delivery options and never silently renames an existing scope. Guest exports
are attached once to the owning ABI rather than passed redundantly to each
scope binding.
The returned `WasmScope` does not expose its host registry or raw AngularTS
target. Callers retain their own target reference and use the wrapper's
handle/name, path operations, lifecycle callbacks, watches, and disposal.
Its public instance surface is limited to:

- `imports` for `WebAssembly.instantiate`;
- `disposed` and `dispose()` for host ownership;
- `attach(exports)` after guest instantiation;
- `createScope(scope, options?)` and `getScope(reference)` for registered
  reactive targets.

Scope unregistration, guest callback dispatch, and result-buffer cleanup are
internal. Binding authors trigger those operations through `WasmScope.dispose`,
`WasmScope.bind`, or the guest-facing ABI imports.

Type-only contracts are direct exports from the same subpath:

- `WasmAbiExports`
- `WasmScope`
- `WasmScopeAbi`
- `WasmScopeAbiImports`
- `WasmScopeAbiImportObject`
- `WasmScopeBindingOptions`
- `WasmScopeOptions`
- `WasmScopeReference`
- `WasmScopeUpdate`
- `WasmScopeWatchOptions`

`WasmScope` and `WasmScopeAbi` are type-only exports. Runtime construction goes
through `WasmAbi.create()`, and low-level ABI contracts do not appear in the
ambient `ng` namespace. Both are interfaces rather than constructible classes;
their concrete host implementations remain private.

## Language Targets

All language targets share the same ABI. They differ only in how they expose
allocation, imported host functions, and typed helper APIs.

### Rust

Rust is the first proof-of-concept target.

The Rust integration may use `wasm-bindgen` for package loading and ergonomic
browser interop, but `WasmScope` itself uses the language-neutral ABI through
the `angular-ts` crate facade.

The facade exports the standard allocation functions:

```text
ng_abi_version
ng_abi_alloc
ng_abi_free
```

It also exposes:

```rust
use angular_ts::{read_abi_json, read_abi_string, WasmScope};

let scope = WasmScope::new(scope_handle, "ctrl".to_string());
scope.set("items", items.into());
scope.sync();
let watch_handle = scope.watch("items");
scope.unwatch(watch_handle);
```

Current Rust bindings cover:

```text
scope_get
scope_set
scope_delete
scope_watch
scope_unwatch
scope_sync
buffer_ptr
buffer_len
buffer_free
```

Name-based helpers and unbind helpers remain part of the raw ABI and can be
added to the Rust facade without changing the host contract.

### Go

Go support targets standard Go Wasm.

The Go facade should provide typed helpers over the same `angular_ts` imports
and export:

```text
ng_abi_version
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_transaction
```

The standard Go browser runtime may require `wasm_exec.js` and `syscall/js`.
That runtime glue is allowed for startup, but AngularTS scope access must remain
the shared ABI rather than a Go-specific scope protocol.

### AssemblyScript

AssemblyScript is a direct fit for this ABI.

The AssemblyScript facade should declare the `angular_ts` imports, export
allocation wrappers, and provide typed functions for JSON string encoding,
decoding, scope reads, scope writes, and scope watches. AssemblyScript should
not need `wasm-bindgen` or a Rust-style generated JS adapter to use the ABI.

### C#

C# support should target .NET WebAssembly without changing the ABI.

The C# facade should expose typed scope helpers over the same handle and
pointer/length contract. Blazor or .NET runtime glue may be used to load and
host the module, but AngularTS scope access should still pass through the
`angular_ts` imports and exported allocation/callback functions.

The C# binding should provide helpers equivalent to:

```text
Scope.Get<T>(path)
Scope.Set<T>(path, value)
Scope.Delete(path)
Scope.Sync()
Scope.Watch(path, callback)
Scope.Unbind()
```

If the first C# proof uses Blazor's JavaScript interop for startup, that startup
adapter remains language glue. It must not become a separate AngularTS scope
protocol.

### Zig

Zig should target the ABI directly with imported `angular_ts` functions and
exported allocation/callback symbols. Zig bindings should expose a thin
`Scope` wrapper over either a numeric handle or a UTF-8 name.

### C++

C++ should use the same low-level shape as C, with optional higher-level RAII
wrappers for result buffers and watches.

### C

C is a first-class ABI target and should be the reference for the lowest-level
headers. The C binding should use:

```text
u32 handles or UTF-8 names
u32 pointers
u32 byte lengths
i32 status codes
```

C, C++, and Zig bindings can be thin headers or modules over imported
`angular_ts` functions plus exported allocation and callback symbols.

## Initial Type Model

The generic ABI uses JSON-compatible values:

```text
null
boolean
number
string
array
object
```

Future typed extensions can add specialized binary encodings or typed handles,
but they should be additive. The base ABI remains sufficient for portable
clients.

## Example Flow

1. AngularTS creates a `WasmScope` for a real scope and assigns a
   `scopeHandle` and `scopeName`.
2. AngularTS instantiates Wasm with `angular_ts` imports.
3. AngularTS validates `ng_abi_version`, then attaches guest exports with
   `memory`, `ng_abi_alloc`, and `ng_abi_free`.
4. AngularTS calls `ng_scope_on_bind(scopeHandle, namePtr, nameLen)`.
5. Guest code retains the callback handle or calls `scope_resolve(scopeName)`
   once, then calls `scope_set(scopeHandle, "items", itemsJson)` to update UI
   state.
6. AngularTS templates update through ordinary scope watchers.
7. AngularTS UI mutations trigger one `ng_scope_on_transaction` callback for
   registered watches changed in the same microtask.
8. Either side can call unwatch/unbind lifecycle functions when the component is
   destroyed.
