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

Add the `angular_ts` package from `integrations/dart` to a Dart web project.
Follow `example/basic_app/pubspec.yaml` for a local path setup. Compile the Dart
entry point to JavaScript and load AngularTS before that output.

```bash
make -C integrations/dart check
make -C integrations/dart example-build
make -C integrations/dart runtime-test
```

## Best practices

- Start with handwritten runtime helpers and typed generated bases.
- Use reactive child helpers only where the DOM must follow changing state.
- Use namespaced tag factories for SVG and MathML.
- Keep JavaScript interop at the facade boundary rather than throughout
  features.
- Never edit generated namespace bases; run generation and parity checks.
- Run Dart analysis, unit tests, compilation, and the browser runtime test.

## Executable evidence

The maintained example or acceptance test is
\`integrations/dart/example/basic_app\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
