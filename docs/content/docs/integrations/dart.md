---
title: 'Dart'
weight: 70
description:
  'Install angular_ts, create a typed Dart component, and load it with the
  matching AngularTS runtime.'
---

The `angular_ts` package gives Dart code typed access to AngularTS modules,
injection, components, directives, services, and scopes.

## Install

Add the facade and Web API package:

```bash
dart pub add angular_ts web
```

Compile the entry point:

```bash
dart compile js web/main.dart -o web/main.dart.js
```

Load `@angular-wave/angular.ts` before `main.dart.js`, keep both packages on the
same version, and serve the page over HTTP. The [package
page](https://pub.dev/packages/angular_ts) contains a complete first component.

## Guidance

- Use typed tokens and `inject0` through `inject8` for dependencies.
- Expose template-facing controllers with `@JSExport()` and
  `createJSInteropWrapper()`.
- Keep JavaScript conversion at the edge of the application.
- Test the compiled JavaScript in a real page.

## Complete example

Use `integrations/dart/example/basic_app` as a complete todo project, or browse
all [integration examples](../examples/).
