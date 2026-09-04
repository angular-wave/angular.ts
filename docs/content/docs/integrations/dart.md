---
title: 'Dart'
weight: 70
description:
  'Use the Dart angular_ts package, generated facade bases, typed runtime
  helpers, and a compiled JavaScript application with AngularTS.'
---

The Dart integration wraps the external JavaScript runtime with generated and
handwritten Dart APIs. Dart compiles the application to JavaScript while
AngularTS owns modules, injection, reactivity, compilation, and DOM lifecycle.

## Set up an application

Add the published package, compile the Dart entry point to JavaScript, and load
AngularTS before that output.

```bash
dart pub add angular_ts
```

Use `example/basic_app/pubspec.yaml` when developing against a local checkout.

```bash
make -C integrations/dart check
make -C integrations/dart example-build
make -C integrations/dart runtime-test
```

## Best practices

- Start with handwritten runtime helpers and typed generated bases.
- Import named factories such as `button()` for fixed HTML tag names; use
  `tag()` only when the name is data.
- Use reactive child helpers only where the DOM must follow changing state.
- Use namespaced tag factories for SVG and MathML.
- Use `ProgrammaticViewContext.host` for the component or directive host.
- Keep JavaScript interop at the facade boundary rather than throughout
  features.
- Never edit generated namespace bases; run generation and parity checks.
- Run Dart analysis, unit tests, compilation, and the browser runtime test.

## Executable evidence

The maintained example or acceptance test is
\`integrations/dart/example/basic_app\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
