---
title: Build a smaller production runtime
description:
  Compose, bundle, measure, and verify only the AngularTS features an
  application uses
weight: 99
---

## Problem

The production JavaScript bundle is larger than its measured budget even though
the application uses only a small part of AngularTS. Importing the full runtime
ships directives and services that this page never uses.

## Before you start

Optimize the server response, images, fonts, and application code before
maintaining a custom runtime. Use this recipe only after a production bundle
report shows that unused AngularTS features are material.

[`createAngular`](../../../typedoc/functions/createAngular.html) accepts an
[`AngularComposition`](../../../typedoc/interfaces/AngularComposition.html) and
returns an [`AngularRuntime`](../../../typedoc/classes/AngularRuntime.html). Its
core contains compilation, scopes, controllers, expressions, interpolation, and
exception handling. You explicitly add every directive, service, filter, and
optional [`RuntimeModule`](../../../typedoc/types/RuntimeModule.html) used by
your application.

## Create one runtime entry

Create `src/runtime.ts`. Import package subpaths directly so the bundler can
discard modules that are not reachable from this entry.

<!-- tested-by: src/docs-examples/optimized-runtime-cookbook.test.ts, src/runtime/custom-counter.test.ts -->

```ts
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { ngControllerDirective } from '@angular-wave/angular.ts/directive/controller';
import { ngEventDirectives } from '@angular-wave/angular.ts/directive/events';

const angular = createAngular({
  directives: {
    ngController: ngControllerDirective,
    ngClick: ngEventDirectives.ngClick,
  },
});

class CounterController {
  count = 0;

  increase() {
    this.count += 1;
  }
}

angular
  .module('counterApp', [])
  .controller('CounterController', CounterController);

angular.init(document);

export { angular };
```

Register the exact directive names used by the HTML. A custom runtime does not
discover `ng-click` from a template and add it automatically.

<!-- tested-by: src/docs-examples/optimized-runtime-cookbook.test.ts, src/runtime/custom-counter.test.ts -->

```html
<section ng-app="counterApp" ng-controller="CounterController as counter">
  <strong>{{ counter.count }}</strong>
  <button type="button" ng-click="counter.increase()">Increase</button>
</section>
```

Import optional modules only when the application uses them. For example, add
`routerModule` from `@angular-wave/angular.ts/runtime/router` for browser-owned
routing. Import `sseModule`, `websocketModule`, or `webTransportModule` from
`@angular-wave/angular.ts/runtime/realtime` when only one live transport is
needed. Use `machineModule` or `workflowModule` from
`@angular-wave/angular.ts/runtime/orchestration` instead of their aggregate when
only one orchestration feature is needed. Do not import the package root or
`auto` from this entry; either import restores the general runtime you are
trying not to ship.

## Build it with Vite

Point the production build at the runtime entry. Keep property names intact:
HTML expressions and dependency-injection tokens refer to them by name.

<!-- tested-by: src/docs-examples/optimized-runtime-cookbook.test.ts -->

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: 'hidden',
    rollupOptions: {
      input: 'src/runtime.ts',
      output: {
        entryFileNames: 'assets/runtime-[hash].js',
      },
    },
  },
});
```

Run `npm exec vite build`. Serve the hashed file with a long-lived immutable
cache policy and deploy the generated HTML or manifest that references its new
hash. Upload the hidden source map to error monitoring, but do not serve it as a
public asset unless that is intentional.

Vite's default minifier does not mangle object properties. If a different
minifier is introduced, do not property-mangle controller members, model
members, directive attributes, injection tokens, or names read by server HTML.
Use static `$inject` or array injection for every dependency-bearing function.

## Measure the artifact

Compare the custom build with the existing production build under the same
target, minifier, and compression settings. Record raw, gzip, and Brotli sizes;
the compressed transfer size is the useful network budget. For example, run
`gzip -9 -c dist/assets/runtime-*.js | wc -c` after the build.

Set a CI budget only after recording a stable baseline. Fail on unexpected
growth, but allow an intentional increase when it removes more application code
or improves runtime behavior. Bundle size alone is not a performance result;
also measure startup and the interaction that motivated this work.

## Failure path

Server-rendered and remotely loaded templates are not visible to the bundler.
Inventory their directives explicitly and compile representative responses in
tests. If templates or plugins can introduce unknown AngularTS features, ship
the standard runtime for that application instead of discovering missing
directives in production.

Do not create several nearly identical runtime entries. Share one composition
per application architecture and add a feature deliberately when a tested
template needs it. A few saved bytes are not worth inconsistent behavior across
pages.

## Apply it now

Build the current application and record its compressed runtime size. List the
directives, filters, services, and optional modules used by production HTML.
Create one explicit runtime entry, remove one unused feature group, and compare
both size and startup measurements before removing anything else.

## Verify

Compile every shipped server fragment and route template with the production
runtime. Exercise bootstrap, forms, errors, lazy content, and teardown from the
minified artifact. Confirm omitted services fail in a test, source maps resolve
in monitoring, the server sends compressed hashed assets, and the CI size budget
detects an intentional temporary increase.
