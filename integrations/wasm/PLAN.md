# AngularTS Wasm Integration Plan

## Goal

Provide a language-neutral Wasm boundary for AngularTS scopes.

The shared runtime type is `WasmScope`. It wraps a real AngularTS scope and
allows Wasm clients to read, write, delete, sync, watch, and unbind that scope
through a stable ABI.

`WasmScope` is not the app-owned model boundary. After the model lifecycle
roadmap implements `$snapshot`, `$restore`, and `$sync`, WASM examples and
language bindings must be audited so app-owned state uses `app.model(...)` and
model `$sync()` adapters where appropriate, while `WasmScope` remains the
DOM/root-scoped bridge for view scopes.

This direction is separate from scope sync, event bus, server state sync, and
hydration. Wasm clients mutate wrapped scopes directly. AngularTS then updates
the UI through normal scope traps, watchers, and directive behavior.

The ABI contract is documented in:

```text
integrations/wasm/ABI.md
```

Directive link callback parity across every Wasm language target must follow
the current attrs-free AngularTS shape: `(scope, element)`, `(scope, element,
transclude)`, or `(scope, element, controller, transclude?)`. Attribute helpers
remains part of compile/template/controller APIs only; Wasm directive APIs must
not reintroduce a link-time attributes argument.

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
- the Rust todo app does not require raw `#[wasm_bindgen]` exports,
  handwritten JavaScript entrypoints, manifest export strings, getter methods,
  or repetitive scope synchronization for AngularTS-visible controllers,
  services, methods, or state;
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
ng_abi_version() -> version
ng_abi_alloc(size) -> ptr
ng_abi_free(ptr, size)
ng_scope_on_bind?(scopeHandle, namePtr, nameLen)
ng_scope_on_unbind?(scopeHandle)
ng_scope_on_transaction?(scopeHandle, transactionPtr, transactionLen)
```

AngularTS imports under `angular_ts`:

```text
scope_resolve(namePtr, nameLen) -> scopeHandle
scope_get(scopeHandle, pathPtr, pathLen) -> bufferHandle
scope_set(scopeHandle, pathPtr, pathLen, valuePtr, valueLen) -> 0 | 1
scope_delete(scopeHandle, pathPtr, pathLen) -> 0 | 1
scope_sync(scopeHandle) -> 0 | 1
scope_watch(scopeHandle, pathPtr, pathLen) -> watchHandle
scope_unwatch(watchHandle) -> 0 | 1
scope_unbind(scopeHandle) -> 0 | 1
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
- [x] Move UI-to-Wasm updates to `scope_watch` / `ng_scope_on_transaction`.

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
- [x] Move Rust `ng_scope_on_transaction` dispatch into the shared `WasmScope`
      facade instead of example-specific exports.
- [x] Generate Rust watched path routing metadata instead of requiring manual
      `WasmScope::watch_with` calls in examples.
- [x] Add Rust authoring ergonomics acceptance coverage proving application
      source avoids raw bridge export glue and repetitive scope synchronization.
- [x] Resolve Rust MVP open design questions.
- [x] Update Rust namespace parity so every published `ng` type has an
      explicit final MVP decision.

### Phase E - Deferred Language Binding Guidance

Do not start or expand these implementation tasks until Phase D is complete.
Existing notes and partial helpers remain frozen as reference material. The
selected Rust API expansion sequence, router/state first, realtime second, and
REST third, is now implemented; forms/validation are the remaining
application-level Rust API gap.

- [x] Add Go facade helpers over pointer/length operations.
- [x] Bring Go app-authoring service facades to parity with the completed Rust
      router/state, realtime, and core REST surface.
- [x] Add AssemblyScript facade helpers over pointer/length operations.
- [x] Add C# facade helpers over pointer/length operations.
- [x] Add Zig facade helpers over pointer/length operations.
- [x] Add C++ facade helpers over pointer/length operations.
- [x] Add C facade helpers over pointer/length operations.
- [x] Add a minimal C header-style ABI reference.
- [x] Add Go binding notes.
- [x] Add AssemblyScript binding notes.
- [x] Add C#/.NET WebAssembly binding notes.
- [x] Add Zig binding notes.
- [x] Add C++ binding notes.
- [x] Add C binding notes.
- [x] Add examples showing manual ABI usage without `wasm-bindgen`.

### Phase F - Deferred Additional Language Proofs

Do not start these proof-of-concept implementations until Rust is feature
complete, including the required namespace porting surface.

- [x] Add a Go Wasm todo proof of concept using the shared `WasmScope` ABI.
- [x] Add an AssemblyScript todo proof of concept using the shared `WasmScope`
      ABI.
- [x] Add a C#/.NET WebAssembly todo proof of concept using the shared
      `WasmScope` ABI.
  - [x] Source-level C# todo proof, bootstrap adapter, project metadata, and
        Playwright harness exist under `integrations/wasm/csharp`.
  - [x] CI provisioning and `ci-check` target are wired for .NET SDK,
        WebAssembly workload, browser output publish, and Playwright runtime
        validation.
  - [x] Local `make local-ci-check` bootstrap is documented for installing a
        repo-local .NET SDK and WebAssembly workload before running the same
        build/runtime path.
  - [x] Local `make local-ci-check` compiles the C# browser runtime output and
        runs the Playwright harness without skips.
  - [x] Verify the provisioned CI path compiles the C# todo proof into browser
        runtime output and runs the Playwright harness without skips by running
        its mandatory `ci-check` command locally with the repo-local SDK.
- [x] Add a Zig minimal todo proof using the shared `WasmScope` ABI.
- [x] Add a C++ minimal todo proof using the shared `WasmScope` ABI.
- [x] Add a C minimal todo proof using the shared `WasmScope` ABI.
- [x] Add browser Playwright coverage for all examples.
- [x] Add parity checklists for supported language facades where they expose
      AngularTS namespace types.

### Phase G - Post-Model-Sync Alignment

Model `$snapshot`, `$restore`, and `$sync` are implemented in AngularTS, so this
phase is now active.

- [x] Audit `WasmScope` examples and identify which examples are view-scope
      demos and which should become app-model demos.
- [x] Update `integrations/wasm/ABI.md` with explicit guidance for scope ABI
      versus app-model synchronization.
- [x] Decide whether model sync remains host-side JavaScript only or requires a
      future ABI extension.
- [x] Update Rust reference docs/examples first.
- [x] Update Go, Zig, C++, and C examples after Rust guidance is stable.
- [x] Keep AssemblyScript and C# plans aligned even while their implementation
      remains deferred.
- [x] Update Kotlin, Scala.js, Dart, and Closure generated facade notes where
      model or WASM scope APIs are exposed.
- [x] Add smoke coverage proving model snapshots crossing WASM/runtime
      boundaries are plain data.
- [x] Add loop-prevention coverage for inbound runtime updates that restore
      models with an origin marker.
- [x] Reuse SQLite WASM and Unity WebGL concepts as model-centered validation
      examples.

Audit result:

| Example family | Current boundary | Alignment decision |
| --- | --- | --- |
| Rust basic app and scope bridge | `WasmScope` view scope | Keep as view-scope ABI references. |
| Go todo | `WasmScope` view scope | Keep as view-scope ABI reference. |
| Zig todo | `WasmScope` view scope | Keep as view-scope ABI reference. |
| C++ todo | `WasmScope` view scope | Keep as view-scope ABI reference. |
| C todo | `WasmScope` view scope | Keep as view-scope ABI reference. |
| SQLite WASM concept | `app.model(...)` + `$sync()` | Use as model-centered WASM/data runtime proof. |
| Unity WebGL concept | `app.model(...)` + `$sync()` | Use as model-centered engine/runtime proof. |

Current decision:

- model sync remains host-side JavaScript;
- no model-specific Wasm ABI imports are added in this phase;
- language bindings continue to expose `WasmScope` only for scope/view work;
- model-centered Wasm integrations should be authored as AngularTS services or
  `$sync()` targets around the Wasm runtime.

### Phase H - ABI Namespace Split

The Wasm namespace audit is tracked in:

```text
integrations/wasm/WASM_NAMESPACE_AUDIT.md
```

- [x] Audit which `ng.Wasm*` aliases are ordinary app-facing API and which are
      low-level language-binding ABI.
- [x] Add a `WasmAbi` runtime namespace object on
      `@angular-wave/angular.ts/services/wasm` for binding authors.
- [x] Remove the direct `WasmScopeAbi` runtime export after language examples
      and generated bootstraps migrate; retain it only as a type contract.
- [x] Migrate Rust, Go, C, C++, C#, AssemblyScript, and Zig bootstrap examples
      to the selected ABI namespace import shape.
- [x] Migrate Kotlin, Dart, Gleam, Closure, ClojureScript, and Scala.js generated
      or manual facades away from ambient `ng.Wasm*` ABI aliases.
- [x] Remove low-level ABI aliases from `src/namespace.ts` after the language
      binding migration is complete.
- [x] Regenerate all namespace parity artifacts and TypeDoc after the ambient
      namespace shrink.

### Phase I - App API Ergonomics

- [x] Replace union load results with one stable `WasmResource` carrying
      `ready`, `status`, `error`, typed exports, bindings, and disposal.
- [x] Make `$wasm.load({ source, imports? })` the only app-facing load shape.
- [x] Add `WasmResource.bind(modelOrScope, options?)` as the app-facing bridge
      and keep raw scope handles on the binding-author subpath.
- [x] Drive resource lifecycle state through the owning AppContext so
      `status` and `error` bindings update templates without manual refresh.
- [x] Publish `ng-wasm` resources through the reactive scope proxy and reject
      prototype-sensitive aliases.
- [x] Abort in-flight module fetches when their resource is disposed.
- [x] Align low-level `WasmScope.disposed` with `WasmResource.disposed` and
      `WasmBinding.disposed`; remove the method-form exception.
- [x] Keep the package subpath runtime surface limited to `WasmAbi` and
      `WasmError`, with ABI contracts exported as types only.
- [x] Align manual Dart and Scala.js ABI facades with the final low-level API.
- [x] Remove host bookkeeping methods from the public `WasmScopeAbi` contract
      while retaining explicit ABI lifecycle ownership.
- [x] Reject destroyed binding targets and enforce non-empty, unique active ABI
      scope names before allocating handles.
- [x] Remove the ignored `name` setting from `WasmScope.bind(...)`
      options and align direct Dart and Scala.js ABI facades.
- [x] Hide the owning ABI registry and raw AngularTS target from `WasmScope`;
      retain only the operations binding authors use.
- [x] Replace redundant `WasmScope.bindExports(exports, options)` with
      `WasmScope.bind(options)` and reject attempts to replace attached exports.
- [x] Remove constructor-based export attachment from the host ABI; keep
      one construct-import-instantiate-attach lifecycle.
- [x] Accept native `WebAssembly.Exports` in `attach(...)` and validate the
      reactive ABI at runtime instead of requiring an application-side cast.
- [x] Remove the numeric ABI scope handle from app-facing `WasmBinding` while
      retaining it on the binding-author `WasmScope` contract.
- [x] Preserve the concrete model or scope type through
      `WasmResource.bind(...)` and `WasmBinding.target`.
- [x] Expose the bound target through the handwritten Dart facade so all
      maintained typed integrations retain the app-facing binding contract.
- [x] Initialize watched paths by default when binding while preserving
      `initial: false` for explicitly edge-triggered guests.
- [x] Preserve typed scope state through Dart and Kotlin `bind(...)` results so
      `binding.target` requires no cast in integrations with generic scopes.
- [x] Map closed WASM resource statuses and error codes to Dart and Kotlin enums
      instead of widening framework-owned values to arbitrary strings.
- [x] Replace the nested `new WasmAbi.ScopeAbi()` constructor with the single
      `WasmAbi.create()` factory and migrate generated bootstraps.
- [x] Publish `WasmScope` and `WasmScopeAbi` as factory-returned interfaces so
      generated declarations do not expose uncallable implementation
      constructors.
- [x] Regenerate builds, declarations, TypeDoc, and namespace parity artifacts.

### Phase J - Runtime and ABI Hardening

- [x] Accept native URL, request, response, byte-buffer, typed-array, and
      compiled-module sources without framework-specific source wrappers.
- [x] Fall back from streaming instantiation only for streaming transport/type
      failures; preserve compilation, linking, and start-function failures
      without retrying observable module initialization.
- [x] Validate guest memory ranges, allocator results, path limits, payload
      limits, and malformed JSON at every guest-to-host import boundary.
- [x] Contain guest callback and allocator traps, dispose failed bindings, and
      report lifecycle callback faults through AppContext error handling.
- [x] Require and document an explicit ABI version across the host and every
      maintained language facade.
- [x] Handle resource readiness rejection internally while preserving the
      original rejected `ready` promise for consumers.
- [x] Verify root-package and direct WASM-subpath interoperability against the
      built package.
- [x] Record repeatable loading, binding, read/write, payload, and watched
      update benchmarks through `make benchmark-wasm`.
- [x] Bind `WasmResource` lifecycle properties into scope dependency tracking
      so declarative status, error, and disposal bindings update without a
      manual scope refresh.

### Phase K - Compilation, Diagnostics, and Portability

- [x] Deduplicate successful module compilation per AppContext while creating
      an independent instance for every resource and import object.
- [x] Key compilation reuse by normalized source and native compile options;
      preserve request cache policy and bypass mutable byte-buffer caching.
- [x] Forward native `builtins` and `importedStringConstants` compilation
      options through TypeScript, Kotlin, Dart, and Scala.js facades.
- [x] Reference-count pending compilations so final-consumer disposal and
      runtime teardown abort fetches without canceling active peers.
- [x] Evict failed compilations and add repeated resource, binding, watch, ABI,
      and app-model teardown stress coverage.
- [x] Publish opt-in structured compile, instantiate, load, bind, and guest
      callback timings through the browser Performance API.
- [x] Add one shared executable ABI conformance harness and run it against the
      real Rust, Go, AssemblyScript, C#, Zig, C++, and C browser guests.
- [x] Record standard Go browser allocator limitations as an explicit
      conformance capability while retaining portable package allocator tests.
- [x] Add a managed-worker concept proving one compiled module can create
      independent main-thread and worker instances coordinated by an app model.
- [x] Add the worker proof to the normal Playwright test directory and concept
      index so it cannot silently fall outside CI discovery.

### Phase L - Resource Budgets and Operational Hardening

- [x] Bound live ABI scopes, watches, result buffers, buffered bytes, and
      nested guest callback depth with deterministic failure behavior.
- [x] Bound normalized URL compilation reuse with an internal 64-entry LRU
      while preserving active module and instance ownership.
- [x] Snapshot native compile options before cache lookup and asynchronous
      compilation so caller mutation cannot invalidate cache identity.
- [x] Reject collisions with framework-owned `angular_ts` imports while
      retaining extension imports in that namespace.
- [x] Add actionable fetch, compile, link, start, and bind stages to structured
      `WasmError` values.
- [x] Distinguish compilation cache misses, shared pending work, and settled
      hits in Performance API diagnostics.
- [x] Extend shared ABI conformance with malformed range and UTF-8 probes and
      add host tests for quotas, recursion, memory growth, and teardown.
- [x] Extend benchmarks with concurrent compilation reuse, diagnostics,
      callback fan-out, 1 MiB payload, and cache-eviction cases.
- [x] Extend the managed-worker concept with shared `WebAssembly.Memory`,
      atomic coordination, route-scoped cross-origin isolation, and browser
      coverage.

### Phase M - Transactional and Binary ABI v2

- [x] Apply validated multi-path writes as one reactive transaction and route
      app-model origins through `$restore()` and the model scheduler.
- [x] Suppress guest write echoes by default while allowing explicit
      `{ origin, echo: true }` requests.
- [x] Add owned raw-byte get/set operations that bypass JSON and base64.
- [x] Expose deterministic numeric guest failure codes for handles, memory,
      JSON, paths, quotas, transactions, and unsupported values.
- [x] Upgrade C, C++, Rust, AssemblyScript, Zig, C#, and Go facades to ABI v2
      transaction, binary, and error operations.
- [x] Replace the host-only worker atomic proof with a real shared-memory guest
      imported and executed in both the window and worker.
- [x] Add a focused Chromium, Firefox, and WebKit conformance configuration.
- [x] Persist a deterministic malformed-input corpus and execute it through the
      shared real-guest conformance harness.

### Phase N - Transactional Runtime ABI v3

- [x] Replace per-path guest update callbacks with one coalesced transaction
      callback carrying set, delete, and origin data.
- [x] Generate language-specific path and value contracts from one validated
      binding manifest without adding deep-path types to the app API.
- [x] Extend host, language facade, fuzz, browser, documentation, and benchmark
      gates for ABI v3.

## Requested Language Sequence Status

The requested Go -> Zig -> C++ -> C parity sequence is complete at the source,
wasm-build, format, unit/native test, JavaScript syntax, typecheck, and live
Playwright browser levels. AssemblyScript and C# now meet the same proof-level
runtime requirement and are no longer deferred implementation targets.

## Done Criteria

- Rust integration is feature complete under the Rust-first gate.
- Only after Rust is feature complete, including the required public namespace
  porting surface, Go, AssemblyScript, C#, Zig, C++, and C may resume active
  implementation.
- Model `$snapshot`, `$restore`, and `$sync` exist, and Phase G documents the
  scope/model boundary for the shared ABI, active examples, and language
  integration notes.
- Wasm writes update real AngularTS scopes directly.
- AngularTS UI updates propagate back to Wasm through scope watches.
- Allocation and cleanup are tested.
- The ABI document is the source of truth for all Wasm language targets.
