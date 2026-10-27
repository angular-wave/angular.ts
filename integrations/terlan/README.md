# Angular.ts for Terlan

This package owns Angular's Terlan bindings, lifecycle helpers, and compatibility
policy. The Terlan compiler supplies generic TypeScript parsing and JavaScript
interop; it does not invent Angular APIs.

Prepare this checkout with `make release-build types`, then generate bindings and compile the
Terlan lifecycle helper:

```sh
make bindings TERLC=/path/to/terlc
make build TERLC=/path/to/terlc
make check TERLC=/path/to/terlc
```

`make check` generates fresh bindings, compiles the package with declarations,
and a separate consuming package, then executes component lifecycle callbacks through Angular in Chromium, Firefox,
and WebKit. It verifies callback order, receiver identity, rendered output,
and component destruction. Failed or skipped compilation cannot pass the test.

Consumers may select an installed runtime using `--runtime-root`; declaration
hashes and the selected runtime version are recorded in the generated binding manifest.
The runtime and its declarations always come from the same directory:

```sh
node tool/bindings.mjs --compiler /path/to/terlc \
  --runtime-root /app/node_modules/@angular-wave/angular.ts \
  --out /app/_build/bindings/angular
```

Set `TERLAN_JS_BINDING_MANIFESTS` to the generated
`std/js/manifests/std_js_bindings.json` when compiling package or application
sources. Compile `src` into the application's JavaScript output before importing
`terlan.angular.Lifecycle` from application code. Domain contracts and controllers
remain owned by each application.

Declare the package as a local `[dependencies]` path dependency so
JavaScript source linking can find its Terlan implementations. Changes staged
under this integration run the compilation and three-browser test in the
repository's pre-commit hook; `TERLC` must select a compiler with manifest input
support.

The `compatibility` target retains the two idempotent fixes needed by installed
0.32.0 runtimes. Current Angular.ts source already contains these fixes; the
compiler and applications do not own their implementation.
