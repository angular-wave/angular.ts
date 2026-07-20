# AngularTS C#/.NET Wasm Plan

## Goal

Support C#-authored AngularTS applications through the shared Wasm scope ABI.

C# should use the same `WasmScope` contract as Rust, Go, AssemblyScript, Zig,
and C++. Blazor or .NET WebAssembly runtime glue may be
used for startup, but AngularTS scope access must remain the shared ABI.

## Contract

C# targets the shared ABI documented in:

```text
integrations/wasm/ABI.md
```

This plan covers `WasmScope` only. C# should use the scope ABI for view-local
controller/component state. App-owned state should use `app.model(...)` and
host-side `model.$sync(...)` targets around a .NET/WebAssembly runtime; do not
add model handles, model path writes, or model watch imports to the C# facade
unless the shared ABI adds that surface later.

The C# facade must call the same `angular_ts` imports:

```text
scope_resolve
scope_get
scope_set
scope_delete
scope_sync
scope_watch
scope_unwatch
scope_unbind
buffer_ptr
buffer_len
buffer_free
```

Future directive bindings must use attrs-free link callbacks:
`(scope, element)`, `(scope, element, transclude)`, or
`(scope, element, controller, transclude?)`; attribute helper facades are not part of the public integration API.
compile/template/controller APIs when namespace parity reaches directives.

and export:

```text
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_transaction
```

## Initial Facade Shape

The C# package should expose a typed wrapper:

```csharp
public readonly struct Scope
{
    public uint Handle { get; }
    public string? Name { get; }

    public T? Get<T>(string path);
    public bool Set<T>(string path, T value);
    public bool Delete(string path);
    public bool Sync();
    public Watch Watch(string path, Action<ScopeUpdate> callback);
    public bool Unbind();
}
```

The first implementation can use JSON-compatible values. Later phases can add
source generators or typed bindings for published AngularTS namespace parity.

## Phases

### Phase A - ABI Package

- [x] Create a .NET WebAssembly-compatible AngularTS ABI facade seed.
- [x] Bind the `angular_ts` host imports.
- [x] Export `ng_abi_alloc` and `ng_abi_free`.
- [x] Add UTF-8 string helpers.
- [x] Add JSON encode/decode helpers.
- [x] Add `Scope`, `Watch`, and `ScopeUpdate`; keep result buffers internal.
      wrappers.
- [x] Add an executable source-shape check for the C# facade.
- [x] Add a real .NET project file for the C# facade with opt-in
      `browser-wasm` runtime packaging metadata.
- [x] Add an executable project-shape check that runs `dotnet build` when the
      .NET SDK is available.
- [x] Add CI .NET SDK and WebAssembly workload provisioning for mandatory
      compile validation in the C# Wasm job.
- [x] Add local .NET SDK and WebAssembly workload provisioning, or a documented
      developer bootstrap, so compile validation can be mandatory outside CI.

### Phase B - Todo Proof

- [x] Create a C#/.NET WebAssembly todo example under `integrations/wasm/csharp`.
- [x] Use `Scope.SetJson` to update AngularTS template state through the shared
      `WasmScope` facade.
- [x] Use `Scope.Watch` to receive UI-originated scope updates.
- [x] Add a bootstrap adapter that binds AngularTS `WasmScope` and delegates
      startup to the .NET browser runtime output.
- [x] Add an executable source-shape check for the C# todo proof.
- [x] Add a CI build target that compiles the C# todo proof into browser
      runtime output when the SDK/workload are provisioned.
- [x] Verify the C# todo proof compiles into browser runtime output locally
      with the repo-local SDK/workload bootstrap.
- [x] Verify the provisioned CI path compiles the C# todo proof into browser
      runtime output and runs its Playwright test without skips by executing
      the same mandatory `ci-check` target locally with the repo-local SDK.

### Phase C - Browser Validation

- [x] Add Playwright coverage harness for the C# todo example, skipped until
      the .NET browser runtime output exists.
- [x] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [x] Verify result buffers are freed through C# `Scope.GetJson` readback and
      demo-local ABI import counters in the Playwright harness.
- [x] Keep the browser publish path warning-clean by marking browser-only
      `JSExport` surfaces and trim-sensitive generic JSON helpers explicitly,
      then building the todo proof with `-warnaserror`.

## CI Contract

- [x] Provision .NET 8 and the `wasm-tools` workload in the `csharp-wasm` job.
- [x] Run `make -C integrations/wasm/csharp ci-check` as the mandatory job
      command.
- [x] Compile the facade and todo browser output before Playwright runs.
- [x] Keep the runtime test mandatory once browser output is built; the test
      cannot take its source-only skip path in `ci-check`.
- [x] Upload the C# Playwright report with `if: always()` for failure diagnosis.
- [x] Execute the complete CI command locally with the repo-local .NET SDK and
      confirm facade compilation and browser publication produce zero .NET
      warnings and the runtime test passes without skips.

## Non-Goals

- Reimplement AngularTS in C#.
- Introduce C#-specific scope sync.
- Introduce C#-specific model sync.
- Use `WasmScope` as a substitute for app-owned AngularTS models.
- Depend on event bus for Wasm scope mutation.
- Treat Blazor component rendering as a replacement for AngularTS templates.
