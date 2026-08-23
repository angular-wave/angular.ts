---
title: Debug an HTTP interaction from the browser
description: Trace an element, its scope, its request, and the resulting UI state
weight: 37
tested-by:
  - src/angular.spec.ts
---

## Problem

A click or submission produces the wrong result and you need to find whether the
problem is the element, scope, request, response, or rendering.

## Before you start

Open the Elements, Console, and Network panels. Select the element that owns the
HTTP directive so it is available as `$0` in the console.

## Follow one interaction

<!-- tested-by: src/angular.spec.ts -->

```js
const scope = angular.getScope($0);
scope.order;
```

Check the directive attributes on `$0`, inspect the values used by its
expressions, then perform the interaction with Network recording enabled. Read
the request method, URL, payload, status, content type, and response before
looking at the rendered result.

After the response, inspect the scope again. If the response is correct but the
scope is not, check the directive assignment such as `$res`, `on-success`, or
`on-error`. If scope is correct but the page is not, inspect the binding or
conditional directive that renders it.

## Failure path

Do not debug only the successful request. Preserve the failed response in the
Network panel and inspect the error branch, including status-specific behavior
for `401`, `403`, `409`, `422`, and `5xx` responses.

## Apply it now

Take one interaction that currently feels opaque and write down the value at
each step: element, scope before request, request, response, scope after request,
and DOM result. The first unexpected value identifies the layer to fix.

## Verify

Repeat the trace after the fix. Confirm the request occurs once, the correct
branch runs, and a failed response leaves the scope and DOM in a usable state.
