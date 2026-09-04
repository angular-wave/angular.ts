---
title: 'Rust WebAssembly'
weight: 150
description:
  'Connect Rust domain logic and services to AngularTS with wasm-bindgen.'
---

AngularTS owns the page while Rust handles domain logic and services in a Wasm
module.

## Add the binding

The binding is distributed as source. Add `integrations/wasm/rust/crates/angular-ts`
as a path dependency, install the `wasm32-unknown-unknown` target and
`wasm-bindgen-cli`, then compile the guest and generate its Web loader.

```bash
cargo build --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/debug/app.wasm \
  --target web \
  --out-dir pkg
```

Initialize the generated module before bootstrapping AngularTS.

## Guidance

- Use typed fields instead of raw paths.
- Propagate contract and decode failures.
- Keep watch guards for exactly as long as the subscription is needed.
- Keep durable shared state in AngularTS models.

## Complete examples

Use `integrations/wasm/rust/examples/basic_app` for application registration and
`integrations/wasm/rust/examples/scope_bridge` for direct scope exchange. See
all [integration examples](../examples/).
