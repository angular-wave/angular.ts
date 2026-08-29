---
title: 'Gleam'
weight: 80
description:
  'Set up the Gleam angular_ts package, generated opaque namespace types,
  JavaScript runtime bindings, and parity validation.'
---

The Gleam integration supplies typed externals and opaque generated namespace
types for code compiled to JavaScript. The generated application calls the
normal AngularTS browser runtime.

## Set up an application

Add the published package, compile the Gleam application to JavaScript, and
load AngularTS before the generated script.

```bash
gleam add angular_ts
```

Use `examples/basic_app` when developing against a local checkout.

```bash
make -C integrations/gleam check
make -C integrations/gleam example-build
```

## Best practices

- Keep JavaScript foreign-function declarations inside the integration layer.
- Prefer opaque generated types over untyped dynamic values.
- Use `programmatic_view.host` and the typed view helpers instead of reading
  context properties directly.
- Treat generated namespace and injection-token modules as read-only outputs.
- Regenerate after public TypeScript declarations change and review parity.
- Keep runtime and generated binding versions synchronized.
- Run formatting and Gleam tests before building the browser example.

## Executable evidence

The maintained example or acceptance test is
\`integrations/gleam/examples/basic_app\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
