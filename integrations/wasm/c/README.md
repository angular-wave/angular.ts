# AngularTS with C and WebAssembly

Run C domain logic as WebAssembly while AngularTS owns the page and connects the
guest to a scope.

## Add the binding

This binding is distributed as source. Add `include/angular_ts_wasm.h` and
`src/angular_ts_wasm.c` to the guest, include the generated field contract used
by the feature, and compile for `wasm32-freestanding` without an entry point.

The JavaScript host loads the module with `app.wasm(...)`, binds a scope, and
calls the exported feature functions. See `examples/todo/bootstrap.js` for the
complete lifecycle.

## Memory and cleanup

Release every owned `ng_result_t`, cancel watches before their callback state is
freed, and never retain temporary host buffers. Use one update for related field
changes and keep durable shared state in AngularTS models.

See `examples/todo` for the C source, linker exports, host adapter, and page.
