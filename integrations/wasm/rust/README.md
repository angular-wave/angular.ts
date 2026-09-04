# AngularTS with Rust and WebAssembly

Use Rust for domain logic and services compiled with `wasm-bindgen`. AngularTS
owns the page and connects the generated guest objects to modules and scopes.

## Add the binding

This binding is distributed as source. Add `crates/angular-ts` as a path
dependency, install the `wasm32-unknown-unknown` target and `wasm-bindgen-cli`,
then build the guest:

```sh
cargo build --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/debug/app.wasm \
  --target web \
  --out-dir pkg
```

Load the generated JavaScript module from the page and initialize it before
bootstrapping the AngularTS module.

Use typed fields instead of raw paths, propagate decode failures, and keep watch
guards for exactly as long as the subscription is needed. Keep shared durable
state in AngularTS models and exchange snapshots with Rust.

See `examples/basic_app` for component registration and `examples/scope_bridge`
for direct typed scope exchange.
