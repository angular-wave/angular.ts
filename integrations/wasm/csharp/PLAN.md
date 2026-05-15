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

The C# facade must call the same `angular_ts` imports:

```text
scope_resolve
scope_get
scope_get_named
scope_set
scope_set_named
scope_delete
scope_delete_named
scope_flush
scope_flush_named
scope_watch
scope_watch_named
scope_unwatch
scope_unbind
scope_unbind_named
buffer_ptr
buffer_len
buffer_free
```

and export:

```text
ng_abi_alloc
ng_abi_free
ng_scope_on_bind
ng_scope_on_unbind
ng_scope_on_update
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
    public bool Flush();
    public Watch Watch(string path, Action<ScopeUpdate> callback);
    public bool Unbind();
}
```

The first implementation can use JSON-compatible values. Later phases can add
source generators or typed bindings for published AngularTS namespace parity.

## Phases

### Phase A - ABI Package

- [ ] Create a .NET WebAssembly-compatible AngularTS ABI package.
- [ ] Bind the `angular_ts` host imports.
- [ ] Export `ng_abi_alloc` and `ng_abi_free`.
- [ ] Add UTF-8 string helpers.
- [ ] Add JSON encode/decode helpers.
- [ ] Add `Scope`, `Watch`, and `ScopeUpdate` wrappers.

### Phase B - Todo Proof

- [ ] Create a C#/.NET WebAssembly todo example under `integrations/wasm/csharp`.
- [ ] Use `Scope.Set` to update real AngularTS scope state.
- [ ] Use `Scope.Watch` to receive UI-originated scope updates.
- [ ] Add a bootstrap adapter that binds AngularTS `WasmScope`.

### Phase C - Browser Validation

- [ ] Add Playwright coverage for the C# todo example.
- [ ] Verify add, toggle, archive, input clearing, and UI-to-Wasm propagation.
- [ ] Verify result buffers are freed.

## Non-Goals

- Reimplement AngularTS in C#.
- Introduce C#-specific scope sync.
- Depend on event bus for Wasm scope mutation.
- Treat Blazor component rendering as a replacement for AngularTS templates.
