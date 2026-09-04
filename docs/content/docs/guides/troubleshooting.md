---
title: Troubleshoot an application
weight: 70
description:
  Locate AngularTS bootstrap, injection, compilation, reactive, routing, and
  request failures by testing boundaries in order.
---

## Find the first failed boundary

1. Confirm the JavaScript module loaded.
2. Confirm registration completed before `angular.init()` or `bootstrap()`.
3. Confirm `ng-app` names the created module.
4. Read the first AngularTS error, not the cascade.
5. Confirm injected token order matches function parameters.
6. Confirm the owning scope/controller contains the value read by the view.
7. Inspect transport status before changing rendering code.

Raw interpolation means bootstrap or compilation did not complete. “Module not
available” usually means boot order or spelling. “Unknown provider” means the
token is absent from the loaded module graph.

For typed views, verify changing positions receive a function reader rather than
a snapshot. Call keyed item readers inside nested bindings. Replace collection
properties in controller methods. ESM applications import tag factories such as
`div` and `button` directly from `@angular-wave/angular.ts`; no-build UMD
applications use `angular.tags`. Controller typing is supplied to
`component<T>()`; use DOM property names such as `htmlFor`.

Remove sibling features while preserving the failing owner, data, and timing. Do
not hide races with timeouts. Use the [error catalog](/docs/reference/errors/)
after identifying the failed boundary.
