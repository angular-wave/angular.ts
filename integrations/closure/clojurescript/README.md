# AngularTS for ClojureScript

Use AngularTS from ClojureScript with a fluent module API, typed namespace
bindings, and Closure externs that are safe under ADVANCED optimization.

## Add the package

Add the Maven artifact to `shadow-cljs.edn`:

```clojure
{:source-paths ["src/main"]
 :dependencies [[io.github.angular-wave/angular-ts-cljs "0.35.0"]]
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

Keep the Maven artifact and `@angular-wave/angular.ts` on the same version.

## Register a module

```clojure
(ns todo.app
  (:require [angular-ts.core :as ng]))

(defn create-controller []
  (js-obj "title" "Todo list" "todos" #js []))

(defonce app
  (-> (ng/create-module "todo" [])
      (ng/controller "TodoCtrl" [] create-controller)))
```

Use explicit injection vectors. Keep persistent Clojure values in application
code and convert them to JavaScript objects or arrays only when AngularTS must
observe them.

## Build and load

Build with `npx shadow-cljs release app`. Load the matching AngularTS runtime
before `/js/app.js`, then bootstrap the module:

```html
<main id="app" ng-controller="TodoCtrl as ctrl">{{ ctrl.title }}</main>
<script src="angular-ts.umd.js"></script>
<script src="/js/app.js"></script>
<script>
  angular.bootstrap(document.getElementById('app'), ['todo']);
</script>
```

Keep inference warnings enabled and test the ADVANCED build, not only the
development build. See `demo` for the complete todo project.
