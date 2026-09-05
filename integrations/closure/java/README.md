# AngularTS for Java and J2CL

Use AngularTS from Java with typed JsInterop bindings and an annotation
processor for J2CL entry points and template APIs. The Maven artifact contains
both the bindings and the processor.

## Requirements

Install JDK 21, Maven, Node.js, and a J2CL build plugin. Keep the Maven artifact
and `@angular-wave/angular.ts` on the same version.

## Add the Maven dependency

```xml
<dependency>
  <groupId>io.github.angular-wave</groupId>
  <artifactId>angular-ts-java</artifactId>
  <version>0.35.0</version>
</dependency>
```

Use the same artifact in `maven-compiler-plugin` as an annotation processor:

```xml
<annotationProcessorPaths>
  <path>
    <groupId>io.github.angular-wave</groupId>
    <artifactId>angular-ts-java</artifactId>
    <version>0.35.0</version>
  </path>
</annotationProcessorPaths>
<annotationProcessors>
  <annotationProcessor>
    org.angular.ts.processor.AngularClosureProcessor
  </annotationProcessor>
</annotationProcessors>
```

## Register the application

Use `@AngularEntryPoint` on the startup method. Use `@AngularTemplateApi` only
on Java types that an HTML template reads or calls.

```java
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

Configure J2CL to use `goog:angular.ts.generated.entrypoint` and the generated
template extern. The complete plugin configuration is in `demo/pom.xml`.

## Load the result

Load AngularTS before the J2CL bundle and bootstrap the registered module:

```html
<main id="app" ng-controller="TodoCtrl as ctrl"></main>
<script src="angular-ts.umd.js"></script>
<script src="todo.js"></script>
<script>
  angular.bootstrap(document.getElementById('app'), ['todo']);
</script>
```

Build with `mvn package` and serve the output over HTTP. Keep Closure ADVANCED
optimization enabled, expose only the Java members used by templates, and test
the optimized output. See `demo` for a complete Maven project.
