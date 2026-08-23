---
title: 'ClojureScript'
weight: 30
description:
  'Set up the Maven-published ClojureScript facade, packaged Closure externs,
  explicit injection, and strict Shadow CLJS compilation.'
---

The ClojureScript integration is a typed facade over the external AngularTS
browser runtime. It publishes fluent handwritten helpers and exhaustive
generated bindings in one Maven artifact.

## Set up an application

Add the artifact to the project's dependencies:

```text
io.github.angular-wave/angular-ts-cljs:<matching AngularTS version>
```

Require `angular-ts.core` from application namespaces and configure Shadow CLJS
to use the packaged `angular_ts/externs/angular.js` resource. Load the AngularTS
browser bundle separately before the compiled application.

From this repository, build and verify the complete package with:

```bash
make -f integrations/closure/Makefile clojurescript-build
make -f integrations/closure/Makefile clojurescript-test
make -f integrations/closure/Makefile clojurescript-package-check
```

## Best practices

- Use the fluent `angular-ts.core` facade before reaching for generated calls.
- Keep `*warn-on-infer*` enabled and fail on compiler or clj-kondo warnings.
- Pass native ClojureScript collections to facade helpers and convert only at
  framework calls.
- Keep dependency annotations explicit; never infer injection from names.
- Regenerate bindings from Closure externs instead of editing generated files.
- Use Java 21 for the project-pinned Shadow CLJS 3.x toolchain.

## Executable evidence

The maintained example or acceptance test is
\`integrations/closure/clojurescript/demo/index.html\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
