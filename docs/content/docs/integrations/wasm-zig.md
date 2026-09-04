---
title: 'Zig WebAssembly'
weight: 160
description:
  'Connect Zig domain logic to an AngularTS scope with typed fields and explicit
  ownership.'
---

AngularTS owns the page while Zig handles domain logic in a Wasm module.

## Add the binding

The binding is distributed as source. Add
`integrations/wasm/zig/src/angular_ts.zig` as an `angular-ts` module and compile
the guest for `wasm32-freestanding` without an entry point.

Load the result through `app.wasm(...)` and bind it to the component scope from
the host adapter.

## Guidance

- Call `deinit()` for owned decoded results and watch registrations.
- Use allocator-aware decoding only when the application needs custom ownership.
- Apply related field changes through one update.
- Keep durable shared state in AngularTS models.

## Complete example

Use `integrations/wasm/zig/examples/todo`, or browse all [integration
examples](../examples/).
