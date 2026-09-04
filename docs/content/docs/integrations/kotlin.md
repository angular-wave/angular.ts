---
title: 'Kotlin/JS'
weight: 50
description:
  'Add the Kotlin source binding, register an AngularTS module, and build the
  Kotlin/JS output.'
---

The Kotlin integration provides typed access to AngularTS modules, injection,
components, directives, services, and scopes.

## Add the binding

The Kotlin binding is currently distributed as source. Add
`integrations/kotlin` as a Gradle project dependency and use
`integrations/kotlin/examples/basic_app` as the application structure. Enable a
Kotlin/JS IR browser target with an executable binary.

Load the matching `@angular-wave/angular.ts` runtime before the Kotlin/JS output.

## Guidance

- Use typed injection tokens and explicit dependency order.
- Prefer Kotlin wrappers over `dynamic` JavaScript access.
- Keep JavaScript conversion at the edge of the application.
- Build and test the optimized Kotlin/JS output used in deployment.

## Complete example

Use `integrations/kotlin/examples/basic_app` as a complete Gradle project.
`integrations/kotlin/examples/web_components` shows custom elements. See all
[integration examples](../examples/).
