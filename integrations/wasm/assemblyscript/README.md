# AngularTS with AssemblyScript

Run AssemblyScript domain logic as WebAssembly while AngularTS owns the page and
connects the guest to a scope.

## Add the binding

This binding is distributed as source. Import `src/angular_ts.ts` from the guest
and compile with AssemblyScript's incremental runtime and exported runtime
helpers:

```sh
asc main.ts --runtime incremental --exportRuntime --outFile main.wasm
```

Register the Wasm module from JavaScript with `app.wasm(...)`, bind its exports
to the component scope, and release the binding when the scope is destroyed.

Use typed fields for values exchanged with AngularTS. Batch related writes,
copy transient data across the ABI, and keep durable shared state in an
AngularTS model rather than a guest scope handle.

See `examples/todo` for the guest, host adapter, HTML, and complete todo flow.
