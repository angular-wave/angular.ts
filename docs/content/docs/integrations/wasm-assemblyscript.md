---
title: 'AssemblyScript WebAssembly'
weight: 100
description:
  'Connect an AssemblyScript WebAssembly module to AngularTS through the shared
  typed scope ABI and a small JavaScript host adapter.'
---

AssemblyScript compiles domain logic to WebAssembly. A JavaScript host adapter
loads that module, binds it to an AngularTS scope, and owns DOM views. The guest
does not receive JavaScript DOM objects.

## Set up an application

Start from `integrations/wasm/assemblyscript/examples/todo`. Define generated
typed field contracts, compile the guest module, register the host controller or
component, and load its WebAssembly output through the adapter.

```bash
make -C integrations/wasm/assemblyscript check
make -C integrations/wasm/assemblyscript browser-test
```

## Best practices

- Keep the scope ABI focused on one view owner.
- Keep durable shared state in AngularTS models and exchange plain snapshots.
- Batch related guest writes into one typed update.
- Keep DOM construction and programmatic views in the JavaScript host.
- Treat generated field contracts as read-only.
- Test both native guest logic and the browser adapter workflow.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/assemblyscript/examples/todo\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
