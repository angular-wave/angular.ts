# AngularTS J2CL Todo Demo

This demo mirrors `../../demo` with the application code written in Java and
compiled by J2CL. It verifies that the generated AngularTS JsInterop bindings
are usable from handwritten Java source.

The build runs J2CL with Closure Compiler `ADVANCED_OPTIMIZATIONS`.
`@AngularEntryPoint` generates the Closure application entry module during
compilation, so the page does not call an exported Java global.

The Java code does not inject or mutate `$scope`. `App.java` registers the
Java `TodoController` directly through the generated AngularTS JsInterop
bindings. AngularTS proxies the controller, so the page can use
`TodoCtrl as $ctrl`, `ng-model`, and normal event directives without adapters,
snapshots, or Java-side template synchronization helpers.

Types read by AngularTS templates use `@AngularTemplateApi` together with
`@JsType`, `@JsProperty`, and `@JsMethod`. The annotation processor generates
their Closure exports and extern declarations under `target`, keeping runtime
template names stable without handwritten JavaScript adapters.

Build the bindings and demo from the repository root:

```bash
make -f integrations/closure/Makefile java-check
```

Then serve the repository and open:

```text
http://localhost:4000/integrations/closure/java/demo/index.html
```

The generated demo script is written to:

```text
integrations/closure/java/demo/target/webapp/j2cl-todo/j2cl-todo.js
```
