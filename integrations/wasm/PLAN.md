# AngularTS Wasm Integration Plan

## Goal

Provide a language-neutral Wasm boundary for AngularTS scopes.

The shared runtime type is `WasmScope`. It wraps a real AngularTS scope and
allows Wasm clients to read, write, delete, sync, watch, and unbind that scope
through a stable ABI.

This direction is separate from scope sync, event bus, server state sync, and
hydration. Wasm clients mutate wrapped scopes directly. AngularTS then updates
the UI through normal scope traps, watchers, and directive behavior.

The ABI contract is documented in:

```text
integrations/wasm/ABI.md
```

## Design Rules

- `WasmScope` is a scope-boundary wrapper, not a transport protocol.
- Wasm writes must go through normal AngularTS scope mutation semantics.
- AngularTS UI updates can notify Wasm through explicit watched scope paths.
- Memory ownership must be explicit: allocate, copy, release.
- The base ABI must be portable to Rust, Go, AssemblyScript, C#, Zig,
  C++, C, and other Wasm clients.
- Language bindings may be ergonomic, but the ABI remains numeric handles plus
  UTF-8 pointer/length buffers.
- Scope sync and event bus must not be required for Wasm scope mutation.
- Rust is the reference implementation. No additional language target should be
  implemented or expanded until the Rust integration is feature complete.

## Rust-First Gate

The Rust integration is the required reference target for the shared Wasm ABI.
Go, AssemblyScript, C#, Zig, C++, and C work must stay in planning-only
state until Rust reaches feature completeness. Existing non-Rust notes or
partial helpers are frozen; they must not become the active implementation path
until the Rust gate below is complete.

The most important Rust target is eliminating manual bridge duplication. A Rust
application method or field should be authored once, then generated glue should
expose it to AngularTS, register it in metadata, update the wrapped scope, and
wire UI-originated scope changes back into Rust.

Rust is feature complete when:

- the Rust todo app is implemented entirely through the shared `WasmScope` ABI;
- the Rust todo app does not require manual `wasm-bindgen` exports, getters, or
  JavaScript-like bridge glue for AngularTS-visible controllers, services,
  methods, or state;
- Rust-authored modules, services, factories, values, components, controllers,
  typed DI, template files, and lifecycle hooks are generated without
  handwritten JavaScript;
- Rust method, state sync, and scope update lifecycle metadata is generated from
  Rust types and macros, not manifest string lists or conventional method names;
- Rust facade APIs cover the MVP AngularTS services listed in the Rust plan;
- Rust facade APIs cover the required public `ng` namespace porting surface
  listed in the Rust plan, not only the current todo demo behavior;
- unsupported Rust boundary types fail with compile-time diagnostics where the
  macros have enough information;
- compile-fail macro tests cover invalid component metadata, invalid
  injections, and unsupported boundary types;
- generated glue snapshot tests and browser Playwright tests cover the Rust
  example end to end;
- namespace parity for the published AngularTS `ng` namespace has an explicit
  Rust decision and no unreviewed drift;
- all open Rust MVP design questions are resolved in the Rust plan.

## ABI Shape

Guest modules export:

```text
memory
ng_abi_alloc(size) -> ptr
ng_abi_free(ptr, size)
ng_scope_on_bind?(scopeHandle, namePtr, nameLen)
ng_scope_on_unbind?(scopeHandle)
ng_scope_on_update?(scopeHandle, pathPtr, pathLen, valuePtr, valueLen)
```

AngularTS imports under `angular_ts`:

```text
scope_resolve(namePtr, nameLen) -> scopeHandle
scope_get(scopeHandle, pathPtr, pathLen) -> bufferHandle
scope_get_named(namePtr, nameLen, pathPtr, pathLen) -> bufferHandle
scope_set(scopeHandle, pathPtr, pathLen, valuePtr, valueLen) -> 0 | 1
scope_set_named(namePtr, nameLen, pathPtr, pathLen, valuePtr, valueLen) -> 0 | 1
scope_delete(scopeHandle, pathPtr, pathLen) -> 0 | 1
scope_delete_named(namePtr, nameLen, pathPtr, pathLen) -> 0 | 1
scope_sync(scopeHandle) -> 0 | 1
scope_sync_named(namePtr, nameLen) -> 0 | 1
scope_watch(scopeHandle, pathPtr, pathLen) -> watchHandle
scope_watch_named(namePtr, nameLen, pathPtr, pathLen) -> watchHandle
scope_unwatch(watchHandle) -> 0 | 1
scope_unbind(scopeHandle) -> 0 | 1
scope_unbind_named(namePtr, nameLen) -> 0 | 1
buffer_ptr(bufferHandle) -> ptr
buffer_len(bufferHandle) -> len
buffer_free(bufferHandle)
```

## Implementation Phases

### Phase A - Host Types and ABI Surface

- [x] Add `WasmScope` host wrapper.
- [x] Add `WasmScopeAbi` handle registry.
- [x] Add host import object under the `angular_ts` namespace.
- [x] Add guest export typing for allocation, free, and scope callbacks.
- [x] Add JSON UTF-8 buffer exchange helpers.
- [x] Document the ABI contract.

### Phase B - Rust Integration Adoption

- [x] Replace the Rust demo's local JavaScript-object `WasmScope` pattern with
      the AngularTS host `WasmScope` ABI.
- [x] Update generated Rust bootstrap code to create a `WasmScopeAbi`.
- [x] Generate an ABI adapter module for wasm-bindgen's `angular_ts` imports.
- [x] Attach Rust Wasm exports after instantiation.
- [x] Bind component scopes through `WasmScope`.
- [x] Move todo state writes to `scope_set`.
- [x] Move UI-to-Wasm updates to `scope_watch` / `ng_scope_on_update`.

### Phase C - Tests

- [x] Add unit tests for `WasmScope` get/set/delete/sync behavior.
- [x] Add unit tests for result buffer allocation and `buffer_free`.
- [x] Add unit tests for watch registration and callback payloads.
- [x] Add browser Playwright coverage for the Rust todo app through the ABI.
- [x] Add teardown coverage for destroyed scopes and unbound handles.
- [x] Add browser coverage proving AngularTS scope updates propagate back into
      Rust through the Wasm ABI watch callback.

### Phase D - Rust Feature Completion

- [x] Make one-declaration Rust authoring the primary completion target:
      generate exports, wrappers, metadata, refresh, and watch plumbing from
      Rust application declarations.
- [x] Complete the required Rust namespace porting surface documented in
      `integrations/wasm/rust/PLAN.md` before expanding any other Wasm language
      target.
- [x] Collapse duplicated todo bridge layers so methods such as `toggle` are
      authored once in Rust application code.
- [x] Add Rust `#[wasm_bridge]` generation for wasm-bindgen struct and method
      exports.
- [x] Extend Rust `#[wasm_bridge]` to service/value export functions.
- [x] Generate Rust `#[wasm_bridge]` export names from typed targets instead of
      raw `__ng_*` strings in application bridge annotations.
- [x] Infer Rust manifest registration export names from registration kind and
      name.
- [x] Add Rust facade helpers over pointer/length operations.
- [x] Finish Rust lifecycle hook generation for `$onInit` and `$onDestroy`.
- [x] Finish Rust module registration for services, factories, values,
      components, and controllers.
- [x] Finish typed DI diagnostics for invalid injection shapes.
- [x] Add compile-fail macro tests for invalid component metadata.
- [x] Add compile-fail macro tests for invalid injection and unsupported
      boundary types.
- [x] Add generated glue snapshot tests.
- [x] Add method-level Rust facades for the MVP AngularTS services.
- [x] Replace todo example manual `wasm-bindgen` exports and getter glue with
      generated Rust metadata.
- [x] Infer component `syncProperties` and `methods` from templates when Rust
      manifests omit explicit bridge lists.
- [x] Infer standalone controller bridge metadata from an app template when
      Rust manifests omit explicit bridge lists.
- [x] Infer component `controllerAs` aliases from templates when Rust manifests
      omit explicit aliases.
- [x] Remove default-only Rust manifest fields from examples.
- [x] Export Rust registration metadata through generated `__ng_manifest` and
      merge it with build manifest registrations at bootstrap time.
- [x] Source Rust example DI injection lists from Rust metadata instead of
      manifest JSON.
- [x] Drive Rust registration order from runtime metadata, with build manifests
      limited to registration overrides.
- [x] Generate Rust method and state sync metadata instead of relying on
      manifest strings.
- [x] Generate Rust scope update lifecycle metadata instead of relying on
      conventional method names.
- [x] Move Rust `ng_scope_on_update` dispatch into the shared `WasmScope`
      facade instead of example-specific exports.
- [x] Generate Rust watched path routing metadata instead of requiring manual
      `WasmScope::watch_with` calls in examples.
- [x] Add Rust authoring ergonomics acceptance coverage proving application
      source contains no bridge glue.
- [x] Resolve Rust MVP open design questions.
- [x] Update Rust namespace parity so every published `ng` type has an
      explicit final MVP decision.

### Phase E - Deferred Language Binding Guidance

Do not start or expand these implementation tasks until Phase D is complete.
Existing notes and partial helpers remain frozen as reference material.

- [x] Add Go facade helpers over pointer/length operations.
- [ ] Add AssemblyScript facade helpers over pointer/length operations.
- [ ] Add C# facade helpers over pointer/length operations.
- [ ] Add Zig facade helpers over pointer/length operations.
- [ ] Add C++ facade helpers over pointer/length operations.
- [ ] Add C facade helpers over pointer/length operations.
- [ ] Add a minimal C header-style ABI reference.
- [x] Add Go binding notes.
- [ ] Add AssemblyScript binding notes.
- [ ] Add C#/.NET WebAssembly binding notes.
- [ ] Add Zig binding notes.
- [ ] Add C++ binding notes.
- [ ] Add C binding notes.
- [ ] Add examples showing manual ABI usage without `wasm-bindgen`.

### Phase F - Deferred Additional Language Proofs

Do not start these proof-of-concept implementations until Rust is feature
complete, including the required namespace porting surface.

- [x] Add a Go Wasm todo proof of concept using the shared `WasmScope` ABI.
- [ ] Add an AssemblyScript todo proof of concept using the shared `WasmScope`
      ABI.
- [ ] Add a C#/.NET WebAssembly todo proof of concept using the shared
      `WasmScope` ABI.
- [ ] Add Zig, C++, and C minimal todo proofs using the shared `WasmScope` ABI.
- [ ] Add browser Playwright coverage for all examples.
- [ ] Add parity checklists for supported language facades where they expose
      AngularTS namespace types.

## Done Criteria

- Rust integration is feature complete under the Rust-first gate.
- Only after Rust is feature complete, including the required public namespace
  porting surface, Go, AssemblyScript, C#, Zig, C++, and C may resume active
  implementation.
- Wasm writes update real AngularTS scopes directly.
- AngularTS UI updates propagate back to Wasm through scope watches.
- Allocation and cleanup are tested.
- The ABI document is the source of truth for all Wasm language targets.
