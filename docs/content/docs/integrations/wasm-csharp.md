---
title: 'C# and .NET WebAssembly'
weight: 130
description:
  'Build the .NET WebAssembly facade and guest application, install the wasm
  workload, and connect it through an AngularTS JavaScript host.'
---

The C# integration exposes the shared scope ABI through a .NET facade. The .NET
guest handles domain work while a JavaScript adapter owns AngularTS and DOM
integration.

## Set up an application

Install a compatible .NET SDK and the `wasm-tools` workload. Build the facade,
then compile the example and run its browser contract.

```bash
dotnet workload install wasm-tools
make -C integrations/wasm/csharp facade-build
make -C integrations/wasm/csharp example-build
make -C integrations/wasm/csharp runtime-test
```

Use `make -C integrations/wasm/csharp ci-check` in a prepared CI environment.

## Best practices

- Keep JavaScript interop in the host adapter and facade.
- Dispose guest wrappers, watches, and decoded values deterministically.
- Exchange plain snapshots for durable AngularTS model state.
- Keep programmatic views in JavaScript because the ABI has no DOM object
  bridge.
- Pin the SDK and workload used by CI.
- Test facade compilation, WebAssembly output, and the real browser workflow.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/csharp/examples/todo\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
