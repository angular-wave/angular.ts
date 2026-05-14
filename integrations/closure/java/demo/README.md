# AngularTS J2CL Todo Demo

This demo mirrors `../../demo` with the application code written in Java and
compiled by J2CL. It verifies that the generated AngularTS JsInterop bindings
are usable from handwritten Java source.

The build runs J2CL with Closure Compiler `ADVANCED_OPTIMIZATIONS` and an
explicit application entry point. The page loads the optimized bundle and calls
`j2clTodoMain()` to register the AngularTS module.

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
