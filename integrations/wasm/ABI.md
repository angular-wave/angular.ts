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

## Encoding

All cross-boundary strings are UTF-8 byte ranges in guest linear memory:

```text
ptr: u32
len: u32
```

All generic values are JSON encoded into UTF-8 buffers for the initial ABI.
Language bindings may provide typed helpers over that JSON layer.

The raw ABI remains pointer, length, numeric handles, and integer status codes.
When a scope is addressed by name, the name is passed as a UTF-8 pointer/length
pair.

## Handles

The host owns all AngularTS handles. A scope reference can be either a numeric
handle or a stable scope name.

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
  memory: WebAssembly.Memory;

  ng_abi_alloc(size: number): number;
  ng_abi_free(ptr: number, size: number): void;

  ng_scope_on_bind?(
    scopeHandle: number,
    namePtr: number,
    nameLen: number,
  ): void;

  ng_scope_on_unbind?(scopeHandle: number): void;

  ng_scope_on_update?(
    scopeHandle: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): void;
}
```

### `ng_abi_alloc`

Allocates `size` bytes in guest memory and returns the pointer.

AngularTS calls this before writing a string or JSON payload into guest memory.
Returning `0` is reserved for allocation failure.

### `ng_abi_free`

Releases a guest allocation previously returned by `ng_abi_alloc`.

AngularTS calls this after one-shot callback payloads have been delivered. Guest
code calls `buffer_free` for host-owned result buffers; the host then calls
`ng_abi_free` internally.

### `ng_scope_on_bind`

Optional lifecycle callback invoked after a host scope has been bound.

The callback receives:

```text
scopeHandle
scopeName UTF-8 range
```

### `ng_scope_on_unbind`

Optional lifecycle callback invoked before a host scope handle is unbound.

### `ng_scope_on_update`

Optional callback invoked when AngularTS observes a watched scope path.

The callback receives:

```text
scopeHandle
path UTF-8 range
value JSON UTF-8 range
```

## Host Imports

AngularTS exposes the ABI imports under the `angular_ts` import namespace.

```ts
{
  angular_ts: {
    scope_resolve(namePtr, nameLen): scopeHandle;

    scope_get(scopeHandle, pathPtr, pathLen): bufferHandle;
    scope_get_named(namePtr, nameLen, pathPtr, pathLen): bufferHandle;

    scope_set(scopeHandle, pathPtr, pathLen, valuePtr, valueLen): 0 | 1;
    scope_set_named(
      namePtr,
      nameLen,
      pathPtr,
      pathLen,
      valuePtr,
      valueLen,
    ): 0 | 1;

    scope_delete(scopeHandle, pathPtr, pathLen): 0 | 1;
    scope_delete_named(namePtr, nameLen, pathPtr, pathLen): 0 | 1;

    scope_flush(scopeHandle): 0 | 1;
    scope_flush_named(namePtr, nameLen): 0 | 1;

    scope_watch(scopeHandle, pathPtr, pathLen): watchHandle;
    scope_watch_named(namePtr, nameLen, pathPtr, pathLen): watchHandle;
    scope_unwatch(watchHandle): 0 | 1;

    scope_unbind(scopeHandle): 0 | 1;
    scope_unbind_named(namePtr, nameLen): 0 | 1;

    buffer_ptr(bufferHandle): ptr;
    buffer_len(bufferHandle): len;
    buffer_free(bufferHandle): void;
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

### `scope_get_named`

Name-based variant of `scope_get`. The first UTF-8 range is the scope name; the
second UTF-8 range is the path.

### `scope_set`

Writes a JSON payload into a dot-separated path on a bound AngularTS scope.

Returns `1` on success and `0` when the scope handle or path is invalid.

### `scope_set_named`

Name-based variant of `scope_set`.

### `scope_delete`

Deletes a dot-separated path from a bound AngularTS scope.

Returns `1` on success and `0` when the scope handle or path is invalid.

### `scope_delete_named`

Name-based variant of `scope_delete`.

### `scope_flush`

Runs queued Wasm scope bridge callbacks for the bound scope.

Returns `1` on success and `0` when the scope handle is invalid.

### `scope_flush_named`

Name-based variant of `scope_flush`.

### `scope_watch`

Registers an AngularTS watcher for a dot-separated scope path.

Returns a host-owned `watchHandle`. When the path changes, AngularTS invokes
the guest `ng_scope_on_update` export if it exists.

### `scope_watch_named`

Name-based variant of `scope_watch`.

### `scope_unwatch`

Removes a previously registered `watchHandle`.

Returns `1` when a watch was removed and `0` when the handle was unknown.

### `scope_unbind`

Unbinds the host `WasmScope` handle without destroying the AngularTS scope.

Returns `1` when a scope was unbound and `0` when the handle was unknown.

### `scope_unbind_named`

Name-based variant of `scope_unbind`.

### `buffer_ptr`

Returns the guest pointer for a host-owned result buffer.

### `buffer_len`

Returns the byte length for a host-owned result buffer.

### `buffer_free`

Releases a host-owned result buffer and the underlying guest-memory allocation.

Every non-zero `bufferHandle` returned from `scope_get` must be released exactly
once.

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
ng_abi_alloc
ng_abi_free
```

It also exposes:

```rust
use angular_ts::{read_abi_json, read_abi_string, WasmScope};

let scope = WasmScope::new(scope_handle, "ctrl".to_string());
scope.set("items", items.into());
scope.flush();
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
scope_flush
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
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_update
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
Scope.Flush()
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
3. AngularTS attaches guest exports with `memory`, `ng_abi_alloc`, and
   `ng_abi_free`.
4. AngularTS calls `ng_scope_on_bind(scopeHandle, namePtr, nameLen)`.
5. Guest code calls `scope_set(scopeHandle, "items", itemsJson)` to update UI
   state, or `scope_set_named(scopeName, "items", itemsJson)` when targeting a
   known named scope.
6. AngularTS templates update through ordinary scope watchers.
7. AngularTS UI mutations trigger `ng_scope_on_update` for registered watches.
8. Either side can call unwatch/unbind lifecycle functions when the component is
   destroyed.
