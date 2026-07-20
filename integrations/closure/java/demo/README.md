# AngularTS J2CL Todo Demo

This demo mirrors `../../demo` with the application code written in Java and
compiled by J2CL. It verifies that the generated AngularTS JsInterop bindings
are usable from handwritten Java source.

The build runs J2CL with Closure Compiler `ADVANCED_OPTIMIZATIONS` and an
explicit application entry point. The page loads the optimized bundle and calls
`j2clTodoMain()` to register the AngularTS module.

The Java code does not inject or mutate `$scope`. `TodoController` owns the
domain state and actions, while `App.native.js` adapts that controller into an
AngularTS `app.model("todoModel", ...)` service. The registered `TodoCtrl`
returns that model, so the page can use `TodoCtrl as $ctrl`, `ng-model`, and
normal event directives without any Java-side template synchronization helper.

Native JS facade properties that AngularTS templates read must stay quoted so
Closure `ADVANCED_OPTIMIZATIONS` does not rename them.

Build the bindings and demo from the repository root:

```bash
make -f integrations/closure/Makefile java-check \
  JSINTEROP_GENERATOR_JAVA=/path/to/jdk-21/bin/java
```

Then serve the repository and open:

```text
http://localhost:4000/integrations/closure/java/demo/index.html
```

The generated demo script is written to:

```text
integrations/closure/java/demo/target/webapp/j2cl-todo/j2cl-todo.js
```
