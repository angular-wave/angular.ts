# AngularTS Closure Compiler Integration

This integration treats AngularTS as an external browser runtime and compiles
application code with Google Closure Compiler in `ADVANCED` mode with verbose
warnings promoted to errors.

The Closure demo/compiler integration stays isolated from the core build. The
generated externs are also shipped with the core package:

- `externs/angular.js` describes the public AngularTS API and mirrors
  the public `ng` namespace with documented structural Closure externs.
- The root `make build` target validates that file and copies it to
  `dist/externs/angular.js`, which is exported from npm as
  `@angular-wave/angular.ts/externs/angular.js`.
- `demo/app.js` registers the Closure-compiled todo app with AngularTS.
- `demo/todo.js` and `demo/todo-controller.js` are separate `goog.module`
  files for the todo model and controller.
- `demo/goog-base.js` is a compiler-only Closure primitive shim so the demo can
  use `goog.module` / `goog.require` without shipping Closure Library runtime code.
- `demo/index.html` loads the Vite-served AngularTS source runtime and the
  checked-in Closure-compiled todo app output at `demo/compiled.js`.
- `scripts/build.mjs` runs Closure Compiler.
- `scripts/generate-externs.mjs` regenerates documented structural externs from
  the public `ng` namespace and reuses Closure browser externs for DOM/browser
  aliases such as `WindowService`, `DocumentService`, and `RootElementService`.
- `scripts/validate-externs.mjs` fails when a public `ng` namespace type is
  missing from the externs file, lacks a JSDoc extern declaration, lacks a
  structural contract, or the generated externs are out of date.
- `clojurescript/` contains a Shadow CLJS todo demo that generates a typed
  ClojureScript facade from the AngularTS Closure externs and compiles with
  Closure `ADVANCED` optimizations.
- `Makefile` can be included from the repo root later.

Supported direction:

- Closure compiles user application code.
- AngularTS is loaded as a prebuilt external global.

## Commands

From the repository root:

```bash
node integrations/closure/scripts/generate-externs.mjs
make -f integrations/closure/Makefile closure-validate
make -f integrations/closure/Makefile closure-build
make -f integrations/closure/Makefile clojurescript-build
make -f integrations/closure/Makefile closure-test
node integrations/closure/scripts/validate-externs.mjs
```

The demo page is available at:

```text
http://localhost:4000/integrations/closure/demo/index.html
http://localhost:4000/integrations/closure/clojurescript/demo/index.html
```
