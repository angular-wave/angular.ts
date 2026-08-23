---
title: 'Java and J2CL'
weight: 40
description:
  'Configure the Maven JsInterop bindings and annotation processor, compile a
  J2CL application, and load the AngularTS browser runtime separately.'
---

The Java artifact contains generated JsInterop bindings and the annotation
processor that creates Closure entry and template extern files. J2CL compiles
the application to JavaScript; it does not replace the AngularTS runtime.

## Set up an application

Add the same Maven artifact as both a dependency and annotation processor:

```text
io.github.angular-wave:angular-ts-java:<matching AngularTS version>
```

Annotate the startup method with `@AngularEntryPoint`. Annotate template-facing
global Java types with `@AngularTemplateApi`. Configure the selected J2CL plugin
to compile the generated entry point and include the generated template extern.
Load the AngularTS UMD runtime before the J2CL output.

Use the complete Maven consumer configuration in
`integrations/closure/java/demo/pom.xml`. Validate it with:

```bash
make -f integrations/closure/Makefile java-check
```

## Best practices

- Consume published generated bindings; do not regenerate them in applications.
- Keep domain behavior in Java controllers and services, not scope adapters.
- Export only template-facing members and exclude implementation details.
- Compile with Closure ADVANCED optimization and fail on every Java warning.
- Keep the Java artifact version equal to the browser runtime version.
- Use the generated source artifact as required by other JsInterop libraries.

## Executable evidence

The maintained example or acceptance test is
\`integrations/closure/java/demo/index.html\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
