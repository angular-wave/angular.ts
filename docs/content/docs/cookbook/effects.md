---
title: Run an effect when state changes
description: Use scope watches for work outside AngularTS bindings
weight: 11
---

## Problem

A state change must update something outside AngularTS, such as analytics,
storage, a chart, or another browser library.

## Before you start

Use an effect only for work outside AngularTS rendering. Identify the scope that
owns the external resource and the operation that releases it.

## Recipe

Register a `watch` for the scope expression that drives the external work:

<!-- tested-by: src/core/scope/scope.spec.ts -->

```js
const stopThemeEffect = scope.watch('settings.theme', (theme) => {
  themeStore.save(theme);
  chart.setTheme(theme);
});
```

A watch listener runs after the write, in a microtask. Several synchronous
writes to the same property are coalesced before listeners run:

<!-- tested-by: src/core/scope/scope.spec.ts -->

```js
scope.settings.theme = 'light';
scope.settings.theme = 'dark';

// The effect observes the final value: "dark".
```

`watch` returns a deregistration function:

<!-- tested-by: src/core/scope/scope.spec.ts -->

```js
const stop = scope.watch('selectedReport', (report) => {
  reportPreview.open(report);
});

scope.on('$destroy', () => {
  stop();
  reportPreview.destroy();
});
```

The owning scope removes its watches when it is destroyed. Keep explicit cleanup
when the effect also owns an external resource.

## Use bindings for DOM work

Do not use an effect to copy scope values into text, classes, styles, or
visibility. Bind those values with `ng-bind`, `ng-class`, `ng-style`, or
`ng-show`. Use `watch` only when the result lives outside AngularTS.

## Failure path

Effects can loop when they write the value they watch. Keep the watched input
and external output distinct, and make cleanup safe to call once.

## Apply it now

Pick one watcher or state-change callback. If it only changes text, classes,
styles, or visibility, replace it with a binding. If it writes to storage,
analytics, a chart, or another external system, keep it as an effect and name
the resource that must be cleaned up when its scope is destroyed.

## Verify

Write the watched value several times synchronously, destroy the scope, and
confirm one final effect runs and all external resources are released.
