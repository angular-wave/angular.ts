---
title: 'C++ WebAssembly'
weight: 120
description:
  'Connect C++ domain logic to an AngularTS scope with typed access and RAII
  cleanup.'
---

AngularTS owns the page while C++ handles domain logic in a Wasm module.

## Add the binding

The binding is distributed as source and is header-only. Add
`integrations/wasm/cpp/include` to the compiler search path, include
`angular_ts/wasm.hpp`, and compile for `wasm32-wasi` without an entry point.

Load the result through `app.wasm(...)` and bind it to the component scope from
the host adapter.

## Guidance

- Use the C++ scope, watch, and owned result wrappers instead of raw handles.
- Keep browser objects out of guest state.
- Group related field changes in one transaction.
- Keep durable shared state in AngularTS models.

## Complete example

Use `integrations/wasm/cpp/examples/todo`, or browse all [integration
examples](../examples/).
