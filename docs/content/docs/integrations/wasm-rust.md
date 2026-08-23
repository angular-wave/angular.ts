---
title: 'Rust WebAssembly'
weight: 150
description:
  'Use typed Rust field contracts, the scope bridge, generated bootstrap
  manifests, and wasm-bindgen output with AngularTS.'
---

The Rust integration covers both typed scope exchange and an authoring tool that
generates JavaScript registration from a manifest. AngularTS remains the host
runtime and owner of DOM lifecycle.

## Set up an application

Start from `integrations/wasm/rust/examples/basic_app`. Define services and
components, maintain the bootstrap manifest, build the guest package, and let
the Rust tool generate the AngularTS registration adapter.

```bash
make -C integrations/wasm/rust check
make -C integrations/wasm/rust example-build
make -C integrations/wasm/rust browser-test
```

Run `make -C integrations/wasm/rust parity` whenever root namespace types
change.

## Best practices

- Use generated typed fields instead of raw paths.
- Propagate contract and decode failures instead of replacing them with
  defaults.
- Retain watch guards for the desired subscription lifetime and then drop them.
- Keep manifest registration deterministic and review generated JavaScript.
- Keep app-owned shared state in AngularTS models and synchronize snapshots.
- Keep views in the host until a real guest-to-DOM object bridge exists.

## Executable evidence

The maintained example or acceptance test is
\`integrations/wasm/rust/tests/todo_basic.test.ts\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
