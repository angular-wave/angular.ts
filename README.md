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

The result is a high-performance, buildless, multi-paradigm framework that stays
close to Web standards while preserving AngularJS' HTML-first model.

AngularTS is a good fit if you:

- build server-rendered or progressively enhanced web applications
- want a framework that starts simple but still scales to large applications
- need direct DOM access and predictable runtime behavior
- care about performance and low tooling overhead

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

With `@angular-wave/angular.ts/runtime`, you can assemble an `ng` module from
only the directives, providers, filters and services your application uses. 
For example, an application that only needs `ng-bind` and `ng-repeat` can use:

```js
import { createAngularCustom } from "@angular-wave/angular.ts/runtime";
import { ngBindDirective } from "@angular-wave/angular.ts/directives/bind";
import { ngRepeatDirective } from "@angular-wave/angular.ts/directives/repeat";

const angular = createAngularCustom({
  attachToWindow: true,
  ngModule: {
    directives: {
      ngBind: ngBindDirective,
      ngRepeat: ngRepeatDirective,
    },
  },
});

angular.module("app", []);
angular.bootstrap(document, ["app"]);
```

Custom runtime can also be published as a micro app, wrapped in a standalone custom
element (Web Component):

```js
import { defineAngularElement } from "@angular-wave/angular.ts/runtime/web-component";
import { ngClickDirective } from "@angular-wave/angular.ts/directives/events";

defineAngularElement("billing-summary", {
  ngModule: {
    directives: {
      ngClick: ngClickDirective,
    },
    services: {
      billingApi: BillingApi,
    },
  },
  component: {
    shadow: true,
    inputs: {
      accountId: String,
    },
    template: `
      <button ng-click="refresh()">
        {{ accountId }} / {{ status }}
      </button>
    `,
    connected({ dispatch, injector, scope }) {
      const api = injector.get("billingApi");

      scope.status = "ready";
      scope.refresh = () => {
        scope.status = api.status(scope.accountId);
        dispatch("billing-refresh", { status: scope.status });
      };
    },
  },
});
```

```html
<script type="module" src="/widgets/billing-summary.js"></script>
<billing-summary account-id="acct_123"></billing-summary>
```

The minimal directive runtime example above currently comes in around
**32KB** gzip.

For a complete starting point, see
[angular-seed](https://github.com/angular-wave/angular-seed).

## Documentation

Documentation is available at https://angular-wave.github.io/angular.ts/.
