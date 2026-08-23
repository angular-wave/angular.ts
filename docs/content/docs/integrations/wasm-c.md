---
title: 'C WebAssembly'
weight: 110
description:
  'Build a C WebAssembly guest with typed field descriptors, explicit ownership,
  batched scope updates, and a JavaScript AngularTS host.'
---

The C binding wraps the shared numeric and byte scope ABI. C owns guest memory;
JavaScript owns AngularTS registration, DOM views, and browser objects.

## Set up an application

Start from `integrations/wasm/c/examples/todo`. Generate or declare typed field
descriptors, compile the C source to WebAssembly, and use the example bootstrap
adapter to bind the module to an AngularTS scope.

```bash
make -C integrations/wasm/c check
make -C integrations/wasm/c wasm-build
make -C integrations/wasm/c browser-test
```

## Best practices

- Pair every owned decoded value, watch, and allocation with cleanup.
- Use typed field descriptors instead of raw string paths in feature code.
- Apply related changes through one scope update.
- Copy data across the ABI; never retain temporary host buffers.
- Keep app-owned state in AngularTS models and synchronize snapshots.
- Keep DOM and typed-view callbacks in the JavaScript host adapter.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/c/examples/todo\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
