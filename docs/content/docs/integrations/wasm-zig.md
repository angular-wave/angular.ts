---
title: 'Zig WebAssembly'
weight: 160
description:
  'Build a Zig WebAssembly guest with generated typed fields, explicit decoded
  value ownership, atomic updates, and an AngularTS host adapter.'
---

The Zig binding wraps the shared scope ABI with typed fields and owned decode
results. Zig owns guest memory; JavaScript owns AngularTS components and views.

## Set up an application

Start from `integrations/wasm/zig/examples/todo`. Import the shared `angular-ts`
Zig module and generated contract, compile the guest, then load it through the
example bootstrap adapter.

```bash
make -C integrations/wasm/zig check
make -C integrations/wasm/zig wasm-build
make -C integrations/wasm/zig browser-test
```

## Best practices

- Call `deinit()` for owned decoded results and watch registrations.
- Use allocator-aware decode functions only when application ownership requires
  a custom allocator.
- Publish related field changes through one atomic update.
- Use typed generated fields so path and value types cannot diverge.
- Keep shared durable state in AngularTS models.
- Keep DOM and programmatic view construction in the JavaScript host.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/zig/examples/todo\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
