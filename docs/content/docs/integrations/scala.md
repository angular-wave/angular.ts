---
title: 'Scala.js'
weight: 60
description:
  'Set up Scala.js facades and builders, register an AngularTS module, produce a
  linked browser application, and validate namespace parity.'
---

The Scala.js integration exposes typed facades and idiomatic builders over the
AngularTS JavaScript runtime. Scala.js links application code; the page still
loads AngularTS as the runtime owner.

## Set up an application

Use `integrations/scala/build.sbt` for the supported Scala.js configuration and
`examples/basic_app` for the browser layout. Create a module with the Scala
facade, register components and services, bootstrap a DOM root, and load the
AngularTS runtime before the linked Scala.js script.

```bash
make -C integrations/scala compile
make -C integrations/scala check
make -C integrations/scala runtime-test
```

Use `make -C integrations/scala publish-local` for a separate local sbt
consumer.

## Best practices

- Extend `js.Object` for values crossing the JavaScript boundary.
- Prefer typed builders and injection helpers over `js.Dynamic`.
- Confine unavoidable dynamic access to the integration's unsafe package.
- Keep shared app state in AngularTS models rather than DOM-root scope wrappers.
- Run namespace parity and Scaladoc checks with every facade change.
- Test the linked production-facing browser artifact, not only JVM-side logic.

## Executable evidence

The maintained example or acceptance test is
\`integrations/scala/examples/basic_app\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
