---
title: 'AssemblyScript WebAssembly'
weight: 100
description:
  'Connect AssemblyScript logic to an AngularTS scope through the shared Wasm
  ABI.'
---

AngularTS owns the page while AssemblyScript handles domain logic in a Wasm
module.

## Add the binding

The binding is distributed as source. Import
`integrations/wasm/assemblyscript/src/angular_ts.ts`, compile the guest with
AssemblyScript's incremental runtime and exported runtime helpers, then load the
result through `app.wasm(...)`.

The host adapter binds the guest to a scope and releases it when that scope is
destroyed.

## Guidance

- Use typed fields for values exchanged with AngularTS.
- Batch related writes into one update.
- Copy transient data across the ABI instead of retaining host buffers.
- Keep durable shared state in AngularTS models.

## Complete example

Use `integrations/wasm/assemblyscript/examples/todo`, or browse all
[integration examples](../examples/).
