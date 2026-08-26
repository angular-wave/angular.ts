# AngularTS Java Packages

This folder builds the Maven Central artifact used by Java and Gradle J2CL
applications:

```text
io.github.angular-wave:angular-ts-java
```

The artifact contains Java JsInterop bindings generated from AngularTS Closure
externs and the compile-time annotation processor that generates an
application's Closure entry module and template externs. The processor is
registered through `META-INF/services` and can also be selected explicitly by
Maven or Gradle. No separate processor artifact is published.

The build uses Google's `jsinterop-generator`:

```text
https://github.com/google/jsinterop-generator
```

The generated bindings are intended for GWT/J2CL consumers that need a typed
Java surface for the browser-loaded AngularTS runtime.

## Type Fidelity

The TypeScript namespace is the source of truth for the generated Java API.
After `jsinterop-generator` creates the initial sources, AngularTS applies a
TypeScript-aware refinement pass so Java retains the closest honest equivalent:

- TypeScript callbacks become `@JsFunction` contracts.
- Arrays, maps, and records become `JsArray`, `JsMap`, and `JsPropertyMap`.
- Promises retain their resolved value type.
- DOM and browser API values use their Elemental2 contracts.
- AngularTS contracts and generic arguments remain named and parameterized.
- Public methods carry the canonical AngularTS description, and every argument
  is documented with its source parameter name in generated Javadoc.

Java `Object` is retained when the TypeScript contract is `unknown`, `object`,
or an `any`-style open value, and for unions or dependent indexed types that
Java cannot represent without claiming a narrower contract. It is not used as
the default for a representable TypeScript type.

Programmatic views generate named `ComponentView` and `DirectiveView`
callbacks. Their context contracts expose ordinary Java accessors such as
`getController()`, `getScope()`, and `getElement()`. `Angular.tags(...)`
provides the namespaced tag collection; property-based HTML tag access remains
a `JsPropertyMap` because Java cannot statically model JavaScript proxy keys.

Consumers should not regenerate these bindings. The published artifact should
include the compiled classes plus a source jar containing the generated
JsInterop sources, and J2CL consumers should depend on that source artifact as
they would with other JsInterop libraries.

## Coordinates

The published artifact uses GitHub-owned Maven Central coordinates:

```xml
<groupId>io.github.angular-wave</groupId>
<artifactId>angular-ts-java</artifactId>
<version>0.33.2</version>
```

The generated Java package prefix remains `org.angular.ts`, matching the
AngularTS public namespace exposed to JsInterop consumers.

## Generate And Build

From the repository root:

```bash
mvn -f integrations/closure/java/pom.xml package
```

By default the build:

1. Validates that `../externs/angular.js` is current.
2. Builds or copies `ClosureJsinteropGenerator_deploy.jar`.
3. Generates a Java/J2CL-compatible extern from the strict Closure extern.
4. Runs `jsinterop-generator` against the Java/J2CL extern.
5. Unpacks the generated source jar into `target/generated-sources/jsinterop`.
6. Verifies that required AngularTS public types were generated.
7. Compiles and packages the Java library.

If you already have a generator jar, bypass the upstream source build:

```bash
JSINTEROP_GENERATOR_JAR=/path/to/ClosureJsinteropGenerator_deploy.jar \
  mvn -f integrations/closure/java/pom.xml package
```

The latest upstream generator currently requires a Java 21 runtime to execute.
Maven automatically discovers and selects an installed JDK 21 toolchain, even
when Maven itself runs on an older JDK:

```bash
mvn -f integrations/closure/java/pom.xml package
```

Set `JSINTEROP_GENERATOR_JAVA` to an actual Java 21 executable only when
automatic toolchain discovery is unavailable.

The J2CL demo uses the latest published J2CL Maven plugin, which targets an
older Java bytecode toolchain. `java-check` selects an installed Java 11 runtime
for that demo to keep its build warning-free. Override the detected runtime with
`J2CL_JAVA_HOME=/path/to/jdk-11`; when Java 11 is unavailable, the build falls
back to the active Java runtime.

The build pins `jsinterop-generator` to `v20250910` by default so release output
is reproducible. To intentionally test a different generator, override it:

```bash
mvn -f integrations/closure/java/pom.xml package \
  -Djsinterop.generator.version=v20251001
```

If the requested deploy jar is not already cached, `scripts/prepare-jsinterop-generator.sh`
downloads that upstream source archive and builds the deploy jar with `bazel`,
`bazelisk`, or `npx @bazel/bazelisk`.

## Extern Split

AngularTS keeps two extern shapes:

```text
../externs/angular.js
```

This is the strict Closure Compiler extern and should stay as precise as the
compiler accepts.

```text
target/generated-sources/angular-ts-java-src.externs.js
```

This file is generated by `scripts/generate-jsinterop-externs.mjs` for
`jsinterop-generator`. That generator accepts a smaller subset of Closure type
syntax, so the Java-owned generator keeps the public symbols and JSDoc while
normalizing native collection maps and callback type expressions that cannot be
represented reliably as generated Java.

The Maven build also runs `scripts/verify-generated-jsinterop.mjs` after source
generation so the build fails if key public AngularTS types are missing from the
generated Java output.

## Package Shape

The default generated Java package prefix is:

```text
org.angular.ts
```

Override it at build time if needed:

```bash
mvn -f integrations/closure/java/pom.xml package \
  -Djsinterop.packagePrefix=com.example.angular \
  -Djsinterop.extensionTypePrefix=AngularTs
```

## J2CL Demo

The J2CL todo demo lives in:

```text
demo/
```

Its handwritten Java source is under `demo/src/main/java`. It compiles against
the generated bindings from `target/generated-sources/jsinterop` and writes the
browser script to:

```text
demo/target/webapp/j2cl-todo/j2cl-todo.js
```

The demo uses Closure Compiler `ADVANCED_OPTIMIZATIONS` through the J2CL Maven
plugin. `@AngularEntryPoint` generates the Closure entry module during Java
compilation, and `@AngularTemplateApi` generates the exports and externs needed
for members referenced by AngularTS template strings. Applications do not
maintain JavaScript bootstrap or extern files.

The demo intentionally keeps Java out of AngularTS view-scope plumbing. The
Java `TodoController` owns todo domain behavior and is registered directly
through the generated AngularTS Java bindings. Templates bind to
`TodoCtrl as $ctrl` and `ng-model` normally; they do not receive `$scope`, call
`$digest`, use JavaScript adapters, or run manual refresh helpers.

When adding J2CL examples, annotate the startup method with
`@AngularEntryPoint` and annotate template-facing global JsTypes with
`@AngularTemplateApi`. Public instance fields and methods are exported by
default; use `@JsIgnore` to exclude one or `@JsProperty` and `@JsMethod` to
provide a custom name. The annotation processor runs during `javac` and writes
all Closure wiring under `target`.

Run the full Java integration check from the repository root:

```bash
make -f integrations/closure/Makefile java-check
```

The check fails on every `javac -Xlint:all` warning, exercises valid and invalid
annotation-processor compilations, inspects the packaged JAR contract, builds
the J2CL consumer with Closure `ADVANCED`, and runs its browser test as part of
the complete Closure integration suite.

Then serve the repo and open:

```text
http://localhost:4000/integrations/closure/java/demo/index.html
```

## Publish

The `release` profile adds source, javadoc, signing, and Maven Central
publishing plugins. The J2CL demo is an integration check only and is not
published.

Tagged releases publish this artifact through `.github/workflows/release.yml`.
The workflow reads the Central Portal token and signing key from
`MAVEN_CENTRAL_USERNAME`, `MAVEN_CENTRAL_TOKEN`,
`MAVEN_GPG_PRIVATE_KEY`, and `MAVEN_GPG_PASSPHRASE` repository secrets. See
`RELEASE.md` for the one-time setup and release procedure.

For an intentional local deployment, configure Maven Central credentials in
your Maven settings:

```xml
<servers>
  <server>
    <id>central</id>
    <username>${env.CENTRAL_USERNAME}</username>
    <password>${env.CENTRAL_PASSWORD}</password>
  </server>
</servers>
```

Build the release artifact locally with:

```bash
make -f integrations/closure/Makefile java-package
```

Deploy the artifact with:

```bash
make -f integrations/closure/Makefile java-deploy
```

The POM attaches source and javadoc jars and signs its outputs. The Central
publishing plugin publishes the validated deployment and waits for it to become
available.

## Maven Consumer Setup

Applications use the artifact as a normal dependency and place that same
artifact on the compiler's annotation-processor path:

```xml
<dependency>
  <groupId>io.github.angular-wave</groupId>
  <artifactId>angular-ts-java</artifactId>
  <version>0.33.2</version>
</dependency>

<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <annotationProcessorPaths>
      <path>
        <groupId>io.github.angular-wave</groupId>
        <artifactId>angular-ts-java</artifactId>
        <version>0.33.2</version>
      </path>
    </annotationProcessorPaths>
    <annotationProcessors>
      <annotationProcessor>org.angular.ts.processor.AngularClosureProcessor</annotationProcessor>
    </annotationProcessors>
  </configuration>
</plugin>
```

For the Vertispan J2CL Maven plugin, use `PREFER_MAVEN`, add
`target/generated-sources/annotations` as a source root, select
`goog:angular.ts.generated.entrypoint` as the Closure entry point, and pass
`target/classes/META-INF/externs/angular-ts-template.externs.js` as an extern.
The demo POM contains the complete configuration.

## Gradle Consumer Setup

Gradle uses the same artifact for the application API and annotation
processing:

```kotlin
dependencies {
    implementation("io.github.angular-wave:angular-ts-java:0.33.2")
    annotationProcessor("io.github.angular-wave:angular-ts-java:0.33.2")
}
```

The Java compilation task runs the processor. Configure the selected J2CL
Gradle plugin so its Closure compilation:

1. Depends on `compileJava`.
2. Includes `build/generated/sources/annotationProcessor/java/main`, which
   contains `angular/ts/generated/entrypoint.js`.
3. Uses `goog:angular.ts.generated.entrypoint` as its entry point.
4. Passes
   `build/classes/java/main/META-INF/externs/angular-ts-template.externs.js`
   as an extern.

J2CL Gradle plugins expose source and extern inputs differently, so those four
paths should be attached using the APIs of the plugin selected by the
application. This wiring does not require another published AngularTS artifact.

The browser still loads the AngularTS JavaScript runtime separately; this jar is
only the typed Java/J2CL API surface for that runtime.
