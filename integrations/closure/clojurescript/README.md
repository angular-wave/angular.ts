# AngularTS ClojureScript Closure Integration

This folder contains the publishable ClojureScript facade for the Closure
integration plus a Shadow CLJS todo demo. The demo compiles with Closure
`ADVANCED` optimizations while treating AngularTS as an external browser
runtime.

The public facade in `src/angular_ts/core.cljs` provides fluent,
ClojureScript-native module registration over the exhaustive generated
bindings in `src/angular_ts/generated.cljs`. The generated bindings are
produced from `../externs/angular.js`. They give ClojureScript code concrete
AngularTS type hints such as `^js/ng.NgModule` and `^js/ng.Scope`, and
fail generation if the required AngularTS extern contracts disappear. Extern
JSDoc is preserved where ClojureScript can use it: public type descriptions are
kept in a source-only `public-type-docs` comment block, and generated strict
wrapper and property reader docstrings use the original extern descriptions,
parameter docs, return docs, and property type docs. Generation fails if a
public extern type is missing documentation.

The facade is deliberately strict:

- `*warn-on-infer*` is enabled.
- AngularTS dependency annotations and module requirements accept native
  ClojureScript collections and convert them to JavaScript arrays at the
  framework boundary.
- Generated method wrappers are emitted only when every receiver, parameter, and
  non-void return type has a concrete Closure extern tag that ClojureScript can
  represent. Wildcards, unions, function-typed parameters, and variadic externs
  are skipped unless there is a hand-written strict wrapper.
- Generated property readers are emitted only when the property `@type` has a
  concrete Closure extern tag that ClojureScript can represent.
- The generator pins the reviewed public type-tag and strict wrapper counts, so
  extern-surface changes require an intentional update. It also requires the
  documented fluent facade to cover every public `NgModule` method exactly.
- `clj-kondo` statically analyzes the generated facade, handwritten facade,
  tests, and demo; any finding fails validation.
- The build runs Shadow CLJS with Closure `ADVANCED` optimizations and treats
  compiler warnings as errors.
- A Node-targeted `cljs.test` suite verifies the fluent facade independently of
  the browser demo, and package validation checks the exact Clojars JAR surface.

Generated type hints and property readers include the programmatic view
contracts and `angular.tags`. View callback contexts expose the canonical
`controller`, `required`, `scope`, `element`, and `transclude` members, and the
generated externs preserve those accesses under advanced compilation.

## Commands

From the repository root:

```bash
make -f integrations/closure/Makefile clojurescript-generate
make -f integrations/closure/Makefile clojurescript-format
make -f integrations/closure/Makefile clojurescript-format-check
make -f integrations/closure/Makefile clojurescript-lint
make -f integrations/closure/Makefile clojurescript-build
make -f integrations/closure/Makefile clojurescript-unit-test
make -f integrations/closure/Makefile clojurescript-test
make -f integrations/closure/Makefile clojurescript-package
make -f integrations/closure/Makefile clojurescript-package-check
```

The format targets run project-pinned Shadow CLJS and `cljfmt` tooling, so they
do not require a separately installed Clojure CLI or formatter. The formatting
check is also part of `clojurescript-validate`.

The package target writes Maven Central-ready main, source, and documentation
jars to:

```text
integrations/closure/clojurescript/target/angular-ts-cljs-<version>.jar
integrations/closure/clojurescript/target/angular-ts-cljs-<version>-sources.jar
integrations/closure/clojurescript/target/angular-ts-cljs-<version>-javadoc.jar
```

The jar contains the public `angular-ts.core` facade, the exhaustive
`angular-ts.generated` bindings, and `angular_ts/externs/angular.js`; it does
not include the todo demo.
The committed Maven version must match the root `package.json` version. The
package check enforces that contract before release.

The tag-triggered release workflow publishes the artifact to Maven Central
after the complete repository CI gate passes. For a manually authorized Maven
Central deployment:

```bash
make public-namespace-api
make test-integrations
make -f integrations/closure/Makefile clojurescript-deploy
```

Consumers can depend on the published artifact:

```clojure
{:deps {io.github.angular-wave/angular-ts-cljs {:mvn/version "0.32.0"}}}
```

Application code should require the fluent facade:

```clojure
(ns example.app
  (:require [angular-ts.core :as ng]))

(defonce app
  (-> (ng/module "example" [])
      (ng/controller "AppCtrl" ["todos"] create-controller)))
```

And pass the packaged extern resource to Shadow CLJS:

```clojure
{:compiler-options
 {:externs ["angular_ts/externs/angular.js"]}}
```

Shadow CLJS 3.x uses a Closure Compiler build that requires Java 21. The
Makefile automatically uses an SDKMAN Java 21 installation when present. Set
`CLOJURESCRIPT_JAVA_HOME=/path/to/jdk-21` if your default `java` is older.

The demo page is available at:

```text
http://localhost:4000/integrations/closure/clojurescript/demo/index.html
```
