---
title: 'C WebAssembly'
weight: 110
description:
  'Connect C domain logic to an AngularTS scope with explicit memory ownership.'
---

AngularTS owns the page while C handles domain logic in a Wasm module.

## Add the binding

The binding is distributed as source. Add `include/angular_ts_wasm.h` and
`src/angular_ts_wasm.c` to the guest, include the typed field contract used by
the feature, and compile for `wasm32-freestanding` without an entry point.

Load the result through `app.wasm(...)` and bind it to the component scope from
the host adapter.

## Guidance

- Release every owned result and cancel watches before freeing callback state.
- Never retain temporary host buffers.
- Apply related field changes through one update.
- Keep durable shared state in AngularTS models.

## Complete example

Use `integrations/wasm/c/examples/todo`, or browse all [integration
examples](../examples/).
