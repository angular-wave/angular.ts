# AngularTS with Zig and WebAssembly

Run Zig domain logic as WebAssembly while AngularTS owns the page and connects
the guest to a scope.

## Add the binding

This binding is distributed as source. Add `src/angular_ts.zig` as an
`angular-ts` module and compile the guest for `wasm32-freestanding`:

```sh
zig build-exe -target wasm32-freestanding -fno-entry -rdynamic \
  -femit-bin=main.wasm \
  --dep angular-ts \
  -Mroot=main.zig \
  -Mangular-ts=src/angular_ts.zig
```

The JavaScript host loads the module with `app.wasm(...)`, binds a scope, and
calls the exported feature functions.

Call `deinit()` for owned decoded results and watch registrations. Apply related
field changes in one update, keep paths paired with their value types, and keep
durable shared state in AngularTS models.

See `examples/todo` for the Zig source, host adapter, and page.
