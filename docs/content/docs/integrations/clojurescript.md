---
title: 'ClojureScript'
weight: 30
description:
  'Create a Shadow CLJS application with the Maven facade, packaged externs,
  explicit injection, and the AngularTS browser runtime.'
---

The `angular-ts-cljs` Maven artifact contains the handwritten
`angular-ts.core` facade, generated namespace bindings, and Closure externs.
AngularTS remains a separate browser runtime and must use the same version.

## Before you start

Install Java 21, Node.js, and Shadow CLJS. Create a project with
`src/main/todo/app.cljs`, `shadow-cljs.edn`, and an HTML entry page.

## Configure Shadow CLJS

Add the Maven artifact and tell Closure where the packaged extern file is:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/clojurescript/clojurescript.test.ts -->
```text
{:source-paths ["src/main"]
 :dependencies [[io.github.angular-wave/angular-ts-cljs "0.34.0"]]
 :builds
 {:app {:target :browser
        :output-dir "public/js"
        :asset-path "/js"
        :modules {:app {:entries [todo.app]}}
        :compiler-options
        {:externs ["angular_ts/externs/angular.js"]
         :infer-externs true
         :warnings-as-errors true}}}}
```

Keep `:warnings-as-errors true`; extern or type-tag drift should stop the build
instead of producing renamed runtime calls.

## Register the application

Use `angular-ts.core` for fluent module registration. Dependency names stay
explicit because optimized ClojureScript function names are not injectable
names.

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/clojurescript/clojurescript.test.ts -->
```text
(ns todo.app
  (:require [angular-ts.core :as ng]
            [goog.object :as gobj]))

(defn create-model []
  (js-obj "newTodo" "" "tasks" #js []))

(defn create-controller [model]
  (gobj/set model "add" #(js/console.log "add"))
  model)

(defonce app
  (-> (ng/create-module "todo" [])
      (ng/model "todoModel" [] create-model)
      (ng/controller "TodoCtrl" ["todoModel"] create-controller)))
```

Use JavaScript objects and arrays at the framework boundary. Keep persistent
Clojure collections inside domain code and convert them once when assigning a
template-visible value.

## Load and start the application

Load AngularTS before the compiled module and bootstrap after both are ready:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/closure/clojurescript/clojurescript.test.ts -->
```html
<main id="app" ng-controller="TodoCtrl as ctrl"></main>
<script src="angular-ts.umd.js"></script>
<script src="/js/app.js"></script>
<script>
  angular.bootstrap(document.getElementById('app'), ['todo']);
</script>
```

Build with `npx shadow-cljs release app`. Serve `public` over HTTP.

## Production practices

- Import `angular-ts.view` for named HTML factories and keyed view bindings.

- Prefer the fluent facade; use generated bindings when no facade helper exists.
- Keep `*warn-on-infer*` enabled and fix every inference warning.
- Use explicit injection vectors for controllers, services, directives, and
  configuration blocks.
- Load one AngularTS runtime even when several ClojureScript modules share the
  page.
- Compile and test with Closure ADVANCED optimization before release.

## Tested project

The maintained todo is in `integrations/closure/clojurescript/demo`. Run:

<!-- tested-by: integrations/closure/clojurescript/clojurescript.test.ts -->
```bash
make -f integrations/closure/Makefile clojurescript-test
```

See [Executable integration examples](../examples/) for the aggregate gate.
