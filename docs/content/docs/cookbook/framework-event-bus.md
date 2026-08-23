---
title: Send messages across framework roots
description:
  Use the application event bus for asynchronous cross-boundary notifications
weight: 95
---

## Problem

A component in another framework needs to notify an AngularTS module without
holding its controller, scope, or DOM implementation.

## Before you start

Name the event after something that happened, such as `product:selected`. Keep
the payload small and define its shape at the integration boundary.

## Publish outside and subscribe inside AngularTS

<!-- tested-by: src/services/event-bus/event-bus.spec.ts -->

```js
const app = angular.module('catalog', []);

app.controller('SelectionController', [
  '$eventBus',
  '$scope',
  function SelectionController($eventBus, $scope) {
    this.selected = undefined;
    $eventBus.subscribe(
      'product:selected',
      (product) => (this.selected = product),
      $scope,
    );
  },
]);

externalCatalog.onSelected((product) => {
  angular.eventBus.publish('product:selected', product);
});
```

The injected `$eventBus` and `angular.eventBus` expose the same application bus.
Delivery is asynchronous through a microtask and listeners run in subscription
order. Passing a scope as the subscription context removes the listener when the
scope is destroyed and skips queued delivery to that destroyed scope.

## Use the right event mechanism

Use scope events for parent and child communication in one scope tree. Use DOM
custom events for an element and its owner. Use the event bus for decoupled
modules, workers, realtime services, and non-Angular framework roots.

## Failure path

The bus does not retain the latest payload and does not own state. A late
subscriber does not receive an earlier event. Subscriber failures are sent to
the configured exception handler.

## Apply it now

Replace one global callback registry with a named event bus topic. Give the
subscription a scope owner or call the returned unsubscribe function explicitly.

## Verify

Publish before and after subscribing, destroy the owning scope before queued
delivery, publish twice, and mount the external root twice. Confirm the expected
listener runs once per publication and is removed on teardown.
