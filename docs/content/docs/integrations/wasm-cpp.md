---
title: 'C++ WebAssembly'
weight: 120
description:
  'Build a C++ WebAssembly guest with typed scope wrappers, RAII ownership,
  transactional updates, and host-owned AngularTS views.'
---

The C++ integration provides typed wrappers over the shared scope ABI. The guest
owns domain computation; the JavaScript adapter owns framework registration and
the DOM.

## Set up an application

Start from `integrations/wasm/cpp/examples/todo`. Compile the native tests and
WebAssembly target, then load the output through the example's JavaScript
bootstrap adapter.

```bash
make -C integrations/wasm/cpp check
make -C integrations/wasm/cpp wasm-build
make -C integrations/wasm/cpp browser-test
```

## Best practices

- Use RAII wrappers for watches, decoded values, and guest allocations.
- Keep generated contracts typed and immutable.
- Commit related field changes as one update.
- Keep browser objects and DOM nodes out of guest-owned state.
- Synchronize durable state through AngularTS models, not new ABI handles.
- Run native, WebAssembly type, adapter syntax, and browser tests.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/cpp/examples/todo\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
