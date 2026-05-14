# AngularTS ClojureScript Closure Integration

This folder contains the publishable ClojureScript facade for the Closure
integration plus a Shadow CLJS todo demo. The demo compiles with Closure
`ADVANCED` optimizations while treating AngularTS as an external browser
runtime.

The generated facade in `src/angular_ts/generated.cljs` is produced from
`../externs/angular-ts.externs.js`. It gives ClojureScript code concrete
AngularTS type hints such as `^js/ng.NgModule` and `^js/ng.Scope`, and
fails generation if the required AngularTS extern contracts disappear. Extern
JSDoc is preserved where ClojureScript can use it: public type descriptions are
kept in a source-only `public-type-docs` comment block, and generated strict
wrapper docstrings use the original extern descriptions, parameter docs, and
return docs. Generation fails if a public extern type is missing documentation.

The facade is deliberately strict:

- `*warn-on-infer*` is enabled.
- AngularTS dependency annotations and module requirements use JavaScript
  arrays at the boundary.
- Generated method wrappers are emitted only when every receiver, parameter, and
  non-void return type has a concrete Closure extern tag that ClojureScript can
  represent. Wildcards, unions, function-typed parameters, and variadic externs
  are skipped unless there is a hand-written strict wrapper.
- The generator pins the reviewed public type-tag count and strict wrapper set,
  so extern-surface changes require an intentional update.
- The build runs Shadow CLJS with Closure `ADVANCED` optimizations and treats
  compiler inference warnings as warnings.

## Commands

From the repository root:

```bash
make -f integrations/closure/Makefile clojurescript-generate
make -f integrations/closure/Makefile clojurescript-build
make -f integrations/closure/Makefile clojurescript-test
make -f integrations/closure/Makefile clojurescript-package
```

The package target writes a Maven/Clojars-ready jar and POM to:

```text
integrations/closure/clojurescript/target/angular-ts-cljs-<version>.jar
integrations/closure/clojurescript/target/angular-ts-cljs-<version>.pom
```

The jar contains `angular-ts.generated` plus
`angular_ts/externs/angular-ts.externs.js`; it does not include the todo demo.
The version defaults to the root `package.json` version. Override it with
`CLOJURESCRIPT_PACKAGE_VERSION=...` when needed.

To publish to Clojars after verifying the release:

```bash
make public-namespace-api
make test-integrations
make -f integrations/closure/Makefile clojurescript-deploy
```

Consumers can depend on the published artifact:

```clojure
{:deps {org.angular.ts/angular-ts-cljs {:mvn/version "0.27.0"}}}
```

And pass the packaged extern resource to Shadow CLJS:

```clojure
{:compiler-options
 {:externs ["angular_ts/externs/angular-ts.externs.js"]}}
```

Shadow CLJS 3.x uses a Closure Compiler build that requires Java 21. The
Makefile automatically uses an SDKMAN Java 21 installation when present. Set
`CLOJURESCRIPT_JAVA_HOME=/path/to/jdk-21` if your default `java` is older.

The demo page is available at:

```text
http://localhost:4000/integrations/closure/clojurescript/demo/index.html
```
