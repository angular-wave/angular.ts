---
title: 'Java and J2CL'
weight: 40
description:
  'Create an AngularTS application in Java with the Maven bindings, annotation
  processor, J2CL compiler, and AngularTS runtime.'
---

J2CL compiles Java to JavaScript. The `angular-ts-java` artifact supplies typed
JsInterop bindings and an annotation processor; `@angular-wave/angular.ts`
supplies the browser runtime. Keep both on the same version.

The Maven artifact includes the Java sources and AngularTS externs required by
J2CL. Your application only generates and passes its own template extern.

## Before you start

Install JDK 21, Maven, and Node.js. Create a Maven project with `src/main/java`
for Java sources and a directory for the page that loads the compiled output.

## Add the Java bindings

Add the version and regular dependency to `pom.xml`:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/java/j2cl.test.ts -->
```text
<properties>
  <angular.ts.version>0.34.0</angular.ts.version>
</properties>

<dependencies>
  <dependency>
    <groupId>io.github.angular-wave</groupId>
    <artifactId>angular-ts-java</artifactId>
    <version>${angular.ts.version}</version>
  </dependency>
</dependencies>
```

Use the same artifact as the annotation processor:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/java/j2cl.test.ts -->
```text
<annotationProcessorPaths>
  <path>
    <groupId>io.github.angular-wave</groupId>
    <artifactId>angular-ts-java</artifactId>
    <version>${angular.ts.version}</version>
  </path>
</annotationProcessorPaths>
<annotationProcessors>
  <annotationProcessor>
    org.angular.ts.processor.AngularClosureProcessor
  </annotationProcessor>
</annotationProcessors>
```

The dependency supplies its runtime extern automatically. The processor
generates the application Closure entry point and template extern. Configure
the J2CL Maven plugin with `goog:angular.ts.generated.entrypoint` and
`META-INF/externs/angular-ts-template.externs.js`. The complete tested plugin
configuration is in `integrations/closure/java/demo/pom.xml`.

## Register the application

Mark the startup method with `@AngularEntryPoint`. Mark only Java types that
templates access with `@AngularTemplateApi`.

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/java/j2cl.test.ts -->
```text
@AngularEntryPoint
public static void start() {
  Angular.createModule("todo", new String[0])
      .controller("TodoCtrl", (TodoFactory) TodoController::new);
}

@JsFunction
interface TodoFactory {
  TodoController create();
}
```

The maintained todo demonstrates public fields, template methods, directives,
and array replacement in `integrations/closure/java/demo/src/main/java`.

## Load and start the application

Load AngularTS first, then the J2CL bundle, then bootstrap the registered module:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/java/j2cl.test.ts -->
```html
<main id="app" ng-controller="TodoCtrl as ctrl"></main>
<script src="angular-ts.umd.js"></script>
<script src="todo.js"></script>
<script>
  angular.bootstrap(document.getElementById('app'), ['todo']);
</script>
```

Build with `mvn package`. Serve the page over HTTP; do not open it through a
`file:` URL.

## Production practices

- Use the published artifact as a dependency; never copy generated bindings
  into the application.
- Keep Closure ADVANCED optimization enabled and keep template extern
  generation in the build.
- Expose the smallest possible template API. Unannotated Java implementation
  details remain optimizable.
- Replace Java arrays when their length changes so AngularTS observes the new
  collection identity.
- Test the optimized J2CL output against the matching AngularTS bundle.

## Complete example

Use `integrations/closure/java/demo` as a complete Maven and J2CL todo project,
or browse all [integration examples](../examples/).
