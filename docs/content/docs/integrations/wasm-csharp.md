---
title: 'C# and .NET WebAssembly'
weight: 130
description:
  'Connect C# domain logic to an AngularTS scope with .NET WebAssembly.'
---

AngularTS owns the page while C# handles domain logic in a .NET Wasm module.

## Add the binding

The binding is distributed as source. Install .NET 8 and the `wasm-tools`
workload, add a project reference to
`integrations/wasm/csharp/src/AngularTs.Wasm.csproj`, and publish the application
for `browser-wasm`.

```bash
dotnet workload install wasm-tools
dotnet publish -c Release -r browser-wasm
```

The host adapter initializes .NET with the AngularTS imports and binds the guest
to a scope.

## Guidance

- Dispose watches and decoded values deterministically.
- Keep JavaScript interop in the host adapter.
- Exchange plain snapshots for durable AngularTS model state.
- Pin the .NET SDK and workload used to build the application.

## Complete example

Use `integrations/wasm/csharp/examples/todo`, or browse all [integration
examples](../examples/).
