# WASM Service

`$wasm` compiles and instantiates WebAssembly modules and connects AngularTS
reactive targets to Wasm guests. Ordinary application state remains owned by
app-context models or root scopes; a `WasmResource` owns only its instance,
bindings, and teardown.

## Public Surface

```ts
const math = $wasm.load<{ add(left: number, right: number): number }>({
  source: new URL("./math.wasm", import.meta.url),
});

await math.ready;
math.exports.add(2, 3);
```

- `load({ source, imports?, compile?, diagnostics? })` immediately returns one
  stable `WasmResource`.
- `source` accepts a URL string, `URL`, `Request`, `Response`, `BufferSource`,
  or compiled `WebAssembly.Module`. Native `Request` objects carry credentials,
  integrity, headers, and cache policy without framework-specific options.
- `ready` resolves with that resource after fetch and instantiation.
- `status`, `error`, `WasmError.code`, and `WasmError.stage` make lifecycle
  failures declarative and distinguish fetch, compile, link, start, and bind
  failures.
- `instance`, `module`, and typed `exports` are available after readiness.
- `bind(modelOrScope, options?)` connects either an app model or a DOM scope to
  the guest's AngularTS ABI and returns an owned `WasmBinding` whose `target`
  retains the model or scope's concrete TypeScript type.
- `dispose()` releases every binding and the module resource without destroying
  the bound AngularTS target. Disposing during loading also aborts the module
  fetch when no other resource is waiting for the same compilation.

URL and request sources use streaming compilation when possible. AngularTS
falls back to buffered compilation only when streaming reports a `TypeError`,
normally an incorrect Wasm MIME type. Compilation, linking, and start-function
failures are never retried. Caller-owned requests and responses are cloned.

## Compilation Ownership

The owning AppContext caches successful compiled modules and creates a fresh
`WebAssembly.Instance` with each resource's imports. Concurrent loads of the
same normalized URL and compile options share one compilation. `Request` and
`Response` sources share by object identity; requests using `no-store` or
`reload` do not share. Mutable byte buffers bypass the cache. Failed
compilations are evicted so a later load can retry.
The normalized URL cache is a 64-entry least-recently-used cache. Eviction only
removes compilation reuse; active resources retain their compiled module and
instance.

Native compile options are forwarded without framework translation and are
part of cache identity. AngularTS snapshots the options before asynchronous
compilation so later caller mutation cannot change what the cache key means:

```ts
const resource = $wasm.load({
  source: new URL("./strings.wasm", import.meta.url),
  compile: {
    builtins: ["js-string"],
    importedStringConstants: "string_constants",
  },
});
```

Disposal releases one reference to a pending compilation. The underlying fetch
is aborted synchronously only after its final waiting resource is disposed.
Runtime teardown disposes every resource, aborts remaining pending
compilations, and clears the AppContext cache.

Register app-owned resources with the module API:

```ts
angular.module("game", []).wasm("physics", {
  source: new URL("./physics.wasm", import.meta.url),
});
```

`ng-wasm` uses the same service and exposes the `WasmResource`, not bare guest
exports. Templates therefore react to `resource.status` and `resource.error`
without a manual scope refresh, and call `resource.exports` only when ready.

## Reactive Binding

```ts
const binding = await physics.bind(playerModel, {
  name: "player",
  watch: ["position", "health"],
});
```

Names are resolved once by guest facades and all subsequent ABI operations use
an internal numeric handle. App code receives only the binding name, typed
target, lifecycle state, and `dispose()` operation. Active names must be
non-empty and unique within a resource; invalid or destroyed targets reject
with `WasmError.code === "binding"`.
Watched paths publish their current values when binding. Set `initial: false`
only for edge-triggered guests that should receive future changes exclusively.
Destroying the model or scope disposes its binding. Destroying the resource
disposes all bindings. Neither operation destroys the other side.

## Binding Authors

The pointer/length ABI, host buffers, and `WasmScopeAbi` are intentionally not
part of ambient `ng`. Language integration authors import them from the direct
service subpath:

```ts
import { WasmAbi } from "@angular-wave/angular.ts/services/wasm";

const abi = WasmAbi.create();
```

Create the ABI before instantiating the guest so `abi.imports` can be supplied
to WebAssembly, then call `abi.attach(instance.exports)` exactly once. There is
no constructor shortcut with a second initialization path. `attach()` accepts
the browser's native `WebAssembly.Exports` value and validates the required
AngularTS memory and allocation exports at runtime.

The binding-author ABI exposes only `imports`, `disposed`, `attach()`,
`createScope()`, `getScope()`, and `dispose()`. Scope registry mutation, guest
callback dispatch, and host-buffer cleanup are driven by `WasmScope` and the
ABI import object rather than public host methods.
`WasmScope` and `WasmScopeAbi` are interfaces returned by the factory; their
private implementation classes and constructors are not part of the package
contract.

ABI v3 keeps the v2 transaction, binary, and error operations and changes host
watch delivery from one callback per path to one callback per transaction:

- `WasmScope.apply({ set, delete }, { origin, echo })` applies one reactive
  transaction. Guest `scope_apply` requests carry the options in the same JSON
  envelope and suppress self-echo by default.
- `getBinary()` / `setBinary()` and `scope_get_binary` /
  `scope_set_binary` transfer owned byte arrays without JSON encoding.
- `WasmAbiError`, `error_code()`, and `error_clear()` let guests distinguish
  invalid handles, memory ranges, JSON, unsafe paths, quotas, and unsupported
  values after a failure return.
- `ng_scope_on_transaction(scopeHandle, transactionPtr, transactionLen)`
  coalesces watched path changes from one microtask into one `{ set, delete,
origin }` payload. Language facades may route that payload back into their
  ordinary per-path watch callbacks without losing transaction access.

When the target is an app-context model, transaction origins flow through
`$restore()` into the model scheduler and `$sync()` loop-prevention contract.
Ordinary scopes receive the same batched DOM reactivity and guest echo policy.

`WasmAbi.version` is the required reactive ABI version. Guest facades export
`ng_abi_version()` and attachment fails with `unsupported-abi` when the version
is missing or different. This is explicit contract validation, not a legacy
compatibility path.

Guest pointers and lengths are validated before host reads or writes linear
memory. Scope names and paths are limited to 16 KiB and JSON/string payloads to
16 MiB. Each ABI additionally owns at most 1,024 scopes, 4,096 watches, 1,024
unreleased result buffers, 64 MiB of result-buffer data, and 32 nested guest
callbacks. Malformed or over-budget guest input returns the ABI operation's
failure value instead of throwing through the application. A guest callback
that traps disposes its binding and is reported through the app context's
configured exception handler.

The `angular_ts` import namespace is framework-owned. Callers may add imports
to it, but names used by the reactive ABI are rejected instead of being
silently replaced.

See `integrations/wasm/ABI.md` for memory ownership and import/export details.

## Runtime Ownership

Every resource created through one `$wasm` service belongs to that AngularTS
runtime. Runtime teardown disposes those resources and rejects later loads.
Directly constructed low-level ABI instances remain caller-owned.

## Diagnostics

Set `diagnostics: true` on a load to publish structured `PerformanceMeasure`
entries. AngularTS emits `angular.ts:wasm:compile`, `:instantiate`, `:load`,
`:bind`, and `:guest-callback`. Entry `detail` includes the source and relevant
fields such as `cacheStatus`, final status, or callback kind. Compilation cache
status is `miss`, `shared-pending`, or `hit`, separating compilation work from
waiting on another resource and settled reuse. Diagnostics are disabled by
default and do not add a separate logging or telemetry service.

```ts
const resource = $wasm.load({ source: "./physics.wasm", diagnostics: true });
await resource.ready;

performance.getEntriesByName("angular.ts:wasm:load");
```

## Typed Contracts

`integrations/wasm/tool/generate-contract.mjs` turns one validated path/type
manifest into deterministic TypeScript, Rust, Go, C, C++, Zig,
AssemblyScript, and C# contracts:

```sh
node integrations/wasm/tool/generate-contract.mjs \
  integrations/wasm/contracts/player.json \
  --out integrations/wasm/contracts/generated
```

Run `make wasm-contracts-check` to reject missing or stale generated files.
The contracts generate only path constants and value types; they do not add
deep-path generic types to the application API.

Compiled `WebAssembly.Module` values are structured-cloneable. The
`concepts/wasm-worker` demo compiles once through `$wasm`, sends
`resource.module` through `$worker`, and creates independent main-thread and
worker instances. An app model and `$sync()` keep worker commands and DOM state
declarative. The concept also transfers a shared `WebAssembly.Memory` and
verifies atomic main-thread/worker access under route-scoped COOP/COEP headers.
Its AssemblyScript guest imports that memory; both the window and worker invoke
the guest's atomic `increment` export, so the proof is not implemented with
host-only `Atomics` calls.

## Tests

`wasm.spec.ts` covers resource lifecycle, compile deduplication and options,
scope and model binding, scope mutation, retention, ABI safety, watching,
buffer ownership, diagnostics, failure eviction, repeated teardown, explicit
disposal, and runtime teardown.
`wasm-package.test.ts` loads the built root bundle and direct WASM service
subpath together to verify reactive model identity across package entrypoints.
`wasm-worker-concept.test.ts` verifies transfer of one compiled module through
the generic `$worker` service and independent execution in both contexts. Every maintained
language demo also runs `integrations/wasm/abi-conformance.ts` against its real
guest runtime. The harness consumes `abi-fuzz-corpus.json`, keeping malformed
transaction and failure-code cases deterministic across languages. Run
`make test-wasm-browsers` for the focused Chromium, Firefox, and WebKit host ABI
and shared-memory suite.
Run `make benchmark-wasm` to record resource loading, binding, get/set,
transactions, raw binary transfer, concurrent compilation reuse, diagnostics
overhead, cache eviction, serialization payload, and watched-update fan-out
baselines.
