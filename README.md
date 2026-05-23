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
- injectables for REST resources, persistent stores, Web Workers, EventSources, WebSockets, streams and WASM modules
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

#### Install

```bash
$ npm i @angular-wave/angular.ts
```

The published package includes generated TypeScript declarations under `@types/`.

or

```html
<script src="
    https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js
"></script>
```

Initialize your app

```html
<div ng-app ng-init="x='world'">Hello {{ x }}</div>
```

## Custom Runtime

The default package includes the full framework: compiler, router, animation
system, HTTP services, storage, workers, streams and other browser integrations.
That is useful for exploration, but a production build should include only the
features actually used by your application.

Custom runtimes start from the runtime entry point and import the emitted files they
need. For example, a counter app only needs interpolation, scope, compile, the
controller directive, and the `ng-click` event directive:

```html
<section ng-app="counterApp" ng-controller="CounterController as counter">
  <button ng-click="counter.decrease()">-</button>
  <strong>{{ counter.count }}</strong>
  <button ng-click="counter.increase()">+</button>
</section>
```

```js
import { createAngularCustom } from "@angular-wave/angular.ts/runtime";
import { ngControllerDirective } from "@angular-wave/angular.ts/directive/controller/controller";
import { ngEventDirectives } from "@angular-wave/angular.ts/directive/events/events";

const angular = createAngularCustom({
  ngModule: {
    directives: {
      ngController: ngControllerDirective,
      ngClick: ngEventDirectives.ngClick,
    },
  },
});

class CounterController {
  count = 0;

  increase() {
    this.count += 1;
  }

  decrease() {
    this.count -= 1;
  }
}

angular.module("counterApp", []).controller("CounterController", CounterController);

angular.init(document);
```

The minimal event-directive runtime example above currently comes in around
**32KB** gzip.

The same counter can also ship as a standalone Web Component microapp. The host
page only needs to load the element definition and place the custom element:

```html
<runtime-counter></runtime-counter>
```

```js
import { ngEventDirectives } from "@angular-wave/angular.ts/directive/events/events";
import { defineAngularElement } from "@angular-wave/angular.ts/runtime/web-component";

defineAngularElement("runtime-counter", {
  ngModule: {
    directives: {
      ngClick: ngEventDirectives.ngClick,
    },
  },
  component: {
    shadow: true,
    scope: {
      count: 0,
    },
    template: `
      <span>
        <button type="button" ng-click="decrease()">-</button>
        <strong>{{ count }}</strong>
        <button type="button" ng-click="increase()">+</button>
      </span>
    `,
    connected({ scope }) {
      scope.increase = () => {
        scope.count += 1;
      };
      scope.decrease = () => {
        scope.count -= 1;
      };
    },
  },
});
```

The element owns its isolated AngularTS runtime, so it can be embedded in a
server-rendered page, another framework, or a larger AngularTS app without a
host-page bootstrap.

For a complete starting point, see
[angular-seed](https://github.com/angular-wave/angular-seed).

## Documentation

Documentation is available at https://angular-wave.github.io/angular.ts/.

IMPORTANT: AngularTS is not backwards-compatible with AngularJS. For teams still working with AngularJS, it presents a frictionless and future-proof path to migration,
which is supported by additional guidance for your LLM of choice.
