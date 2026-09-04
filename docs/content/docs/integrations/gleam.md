---
title: 'Gleam'
weight: 80
description:
  'Install angular_ts, register an AngularTS module from Gleam, and compile the
  application to JavaScript.'
---

The `angular_ts` package supplies typed Gleam functions for modules, dependency
injection, components, and application startup.

## Install

```bash
gleam add angular_ts
```

Build with `gleam build --target javascript`. Load the matching
`@angular-wave/angular.ts` runtime before the generated application script and
serve the page over HTTP.

## Guidance

- Keep foreign JavaScript functions at the edge of the application.
- Prefer typed package functions over untyped JavaScript values.
- Keep the Gleam package and AngularTS runtime on the same version.
- Test the generated JavaScript in a real page.

## Complete example

Use `integrations/gleam/examples/basic_app` for a component, injected store, and
custom element, or browse all [integration examples](../examples/).
