---
title: $controller
description: >
  Controller service
---

`$controller(expression, locals?, later?, ident?)` creates a registered
controller or invokes a controller constructor through dependency injection.
`expression` can be a registered name, a constructor, or an array-annotated
constructor.

`locals` supplies dependency overrides. Every entry is optional, including
`$scope` and `$element`. A supplied `$scope` must be an object and `$element`
must be a DOM node. Exporting a controller with `"Controller as alias"` or
`ident` requires `$scope`; ordinary construction does not.

Passing literal `true` as `later` returns a typed initializer. Its `_instance`
property exposes the pending instance, and calling the initializer runs the
constructor and returns the resulting instance. A constructor that returns a
replacement object updates both `_instance` and the exported scope alias.

Immediate results and calls with a variable boolean flag return `unknown` in
TypeScript. Narrow the result before reading controller-specific properties.
