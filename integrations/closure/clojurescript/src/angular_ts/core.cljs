(ns angular-ts.core
  (:refer-clojure :exclude [filter rest])
  (:require [angular-ts.generated :as generated]))

(def ^js/ng.Angular angular
  "The typed AngularTS browser runtime."
  generated/angular)

(defn injectable
  "Annotate a factory with a ClojureScript collection of dependency names."
  ^js/ng.Injectable [deps factory]
  (generated/injectable deps factory))

(defn module
  "Retrieve or create an AngularTS module."
  (^js/ng.NgModule [^string name]
   (generated/module name))
  (^js/ng.NgModule [^string name requires]
   (generated/module name requires)))

(defn value
  "Register an injectable value and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name object]
  (.value ^js/ng.NgModule ng-module name object))

(defn constant
  "Register an injectable constant and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name object]
  (.constant ^js/ng.NgModule ng-module name object))

(defn config
  "Apply typed AngularTS configuration and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^js/Object options]
  (generated/ng-module-config ng-module options))

(defn run
  "Register a run block, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module block]
   (generated/ng-module-run ng-module block))
  (^js/ng.NgModule [^js/ng.NgModule ng-module deps block]
   (generated/ng-module-run ng-module (injectable deps block))))

(defn component
  "Register a component and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.Component options]
  (generated/ng-module-component ng-module name options))

(defn controller
  "Register a controller, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name factory]
   (generated/ng-module-controller ng-module name factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (generated/ng-module-controller ng-module name (injectable deps factory))))

(defn directive
  "Register a directive, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name factory]
   (generated/ng-module-directive ng-module name factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (.directive ^js/ng.NgModule ng-module name (injectable deps factory))))

(defn factory
  "Register a service factory, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name provider-factory]
   (generated/ng-module-factory ng-module name provider-factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps provider-factory]
   (generated/ng-module-factory
    ng-module name (injectable deps provider-factory))))

(defn service
  "Register a service constructor, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name constructor]
   (generated/ng-module-service ng-module name constructor))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps constructor]
   (generated/ng-module-service ng-module name (injectable deps constructor))))

(defn provider
  "Register a provider constructor, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name constructor]
   (generated/ng-module-provider ng-module name constructor))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps constructor]
   (generated/ng-module-provider ng-module name (injectable deps constructor))))

(defn decorator
  "Decorate an injectable, optionally annotating the decorator dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name decorator-factory]
   (generated/ng-module-decorator ng-module name decorator-factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps decorator-factory]
   (generated/ng-module-decorator
    ng-module name (injectable deps decorator-factory))))

(defn animation
  "Register an animation factory, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name animation-factory]
   (generated/ng-module-animation ng-module name animation-factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps animation-factory]
   (generated/ng-module-animation
    ng-module name (injectable deps animation-factory))))

(defn filter
  "Register a filter factory, optionally annotating its dependencies."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name filter-factory]
   (.filter ^js/ng.NgModule ng-module name filter-factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps filter-factory]
   (.filter ^js/ng.NgModule ng-module name (injectable deps filter-factory))))

(defn model
  "Register a reactive model value or dependency-annotated model factory."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name initial]
   (.model ^js/ng.NgModule ng-module name initial))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (.model ^js/ng.NgModule ng-module name (injectable deps factory))))

(defn machine
  "Register a machine definition or dependency-annotated machine factory."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name definition]
   (generated/ng-module-machine ng-module name definition))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (generated/ng-module-machine ng-module name (injectable deps factory))))

(defn workflow
  "Register a workflow definition or dependency-annotated workflow factory."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name definition]
   (generated/ng-module-workflow ng-module name definition))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (generated/ng-module-workflow ng-module name (injectable deps factory))))

(defn workflow-supervisor
  "Register a workflow supervisor definition or annotated factory."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name definition]
   (.workflowSupervisor ^js/ng.NgModule ng-module name definition))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (.workflowSupervisor
    ^js/ng.NgModule ng-module name (injectable deps factory))))

(defn router
  "Register a router state tree and return the typed router module."
  ^js/ng.RouterModule [^js/ng.NgModule ng-module declaration]
  (.router ^js/ng.NgModule ng-module declaration))

(defn lazy-state
  "Register a lazy router state namespace and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string prefix loader]
  (.lazyState ^js/ng.NgModule ng-module prefix loader))

(defn wasm
  "Register a WebAssembly resource definition or annotated factory."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name options]
   (.wasm ^js/ng.NgModule ng-module name options))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps factory]
   (.wasm ^js/ng.NgModule ng-module name (injectable deps factory))))

(defn worker
  "Register a managed worker and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name script]
   (.worker ^js/ng.NgModule ng-module name script))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name script options]
   (.worker ^js/ng.NgModule ng-module name script options)))

(defn service-worker
  "Configure the application service worker and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module script]
   (.serviceWorker ^js/ng.NgModule ng-module script))
  (^js/ng.NgModule [^js/ng.NgModule ng-module script options]
   (.serviceWorker ^js/ng.NgModule ng-module script options)))

(defn store
  "Register a persistent store and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name constructor storage-type]
   (.store ^js/ng.NgModule ng-module name constructor storage-type))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name constructor storage-type options]
   (.store ^js/ng.NgModule
    ng-module name constructor storage-type options)))

(defn rest
  "Register a REST resource and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url]
   (.rest ^js/ng.NgModule ng-module name url))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url entity-class]
   (.rest ^js/ng.NgModule ng-module name url entity-class))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url entity-class options]
   (.rest ^js/ng.NgModule ng-module name url entity-class options)))

(defn sse
  "Register a server-sent events connection and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url]
   (.sse ^js/ng.NgModule ng-module name url))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url options]
   (.sse ^js/ng.NgModule ng-module name url options)))

(defn websocket
  "Register a WebSocket connection and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url]
   (.websocket ^js/ng.NgModule ng-module name url))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url options]
   (.websocket ^js/ng.NgModule ng-module name url options)))

(defn web-transport
  "Register a WebTransport connection and return the module."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url]
   (.webTransport ^js/ng.NgModule ng-module name url))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^string url options]
   (.webTransport ^js/ng.NgModule ng-module name url options)))

(defn app-component
  "Register an application-host custom element and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name options]
  (generated/ng-module-app-component ng-module name options))

(defn web-component
  "Register an AngularTS-backed custom element and return the module."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name element-class]
  (generated/ng-module-web-component ng-module name element-class))

(defn publish
  "Publish an event-bus value with idiomatic ClojureScript arities."
  (^boolean [^js/ng.EventBusService event-bus ^string topic]
   (generated/event-bus-service-publish event-bus topic))
  (^boolean [^js/ng.EventBusService event-bus ^string topic value]
   (generated/event-bus-service-publish event-bus topic value))
  (^boolean [^js/ng.EventBusService event-bus ^string topic value extra]
   (generated/event-bus-service-publish event-bus topic value extra)))
