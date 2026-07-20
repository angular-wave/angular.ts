## AngularTS

![Build status](https://github.com/angular-wave/angular.ts/actions/workflows/ci.yml/badge.svg)
[![stats](https://data.jsdelivr.com/v1/package/npm/@angular-wave/angular.ts/badge?style=rounded)](https://www.jsdelivr.com/package/npm/@angular-wave/angular.ts)

AngularTS preserves, modernizes and expands the original
[AngularJS](https://angularjs.org/) framework. It keeps its best parts:
declarative templates, dependency injection, controllers,
directives, and two-way binding. It then replaces the legacy digest-era
runtime with reactive change detection, native browser APIs and TypeScript
declarations.

AngularTS builds on AngularJS' decade of production hardening and adds:

- reactive change detection without digests or a virtual DOM
- native DOM APIs in directives and components, with no `jQuery` or `jqLite`
- native `Promise` and browser scheduling APIs instead of `$q` and `$timeout`
- a built-in state router with nested views, resolves, transitions and URL matching
- built-in animations
- declarative HTTP directives inspired by HTMX
- injectables for REST resources, persistent stores, Web Workers, EventSources, WebSockets, and streams
- opt-in WebAssembly loading and reactive scope bridging for JavaScript and WASM language targets
- first class support for Google Closure compiler and its J2CL and ClojureScript compilation targets
- first class support for JS targets: Scala, Kotlin, Gleam
- first class support for WASM targets: Rust, Golang, Zig, C, C++

The result is a high-performance, buildless, multi-paradigm framework that stays
close to Web standards while preserving AngularJS' HTML-first model.

AngularTS is a good fit if you:

- build server-rendered or progressively enhanced web applications
- want a framework that starts simple but still scales to large applications
- need direct DOM access and predictable runtime behavior
- care about performance and low tooling overhead
- want to build parts of your application in another language without 'zero JS' lock-in

## Getting Started

### Install

```bash
npm install @angular-wave/angular.ts
```

The published package includes generated TypeScript declarations under `@types/`.

Or load the default browser runtime directly:

```html
<script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
```

AngularTS starts with HTML:

```html
<div ng-app ng-init="x='world'">Hello {{ x }}</div>
```

For a structured application, register a module and controller while keeping
state and behavior directly available to the template:

```html
<section ng-app="counterApp" ng-controller="CounterController as counter">
  <button type="button" ng-click="counter.decrease()">-</button>
  <strong>{{ counter.count }}</strong>
  <button type="button" ng-click="counter.increase()">+</button>
</section>
```

```js
class CounterController {
  count = 0;

  increase() {
    this.count += 1;
  }

  decrease() {
    this.count -= 1;
  }
}

angular
  .module("counterApp", [])
  .controller("CounterController", CounterController);
```

## Custom Builds

The default browser runtime includes the compiler, router, animations, HTTP,
storage, workers, streams, and common browser integrations. Applications can
instead compose a smaller runtime from explicit framework modules. See
[Angular runtime composition](https://angular-wave.github.io/angular.ts/docs/concepts/angular-runtime/)
for the custom-build API and examples.

For a complete starting point, see
[angular-seed](https://github.com/angular-wave/angular-seed).

## Documentation

Documentation is available at https://angular-wave.github.io/angular.ts/.

IMPORTANT: AngularTS is not backwards-compatible with AngularJS. For teams still working with AngularJS, 
it presents a frictionless and future-proof path to migration, which is supported by additional guidance for your LLM of choice.