---
title: 'Closure Compiler'
weight: 20
description:
  'Compile a JavaScript AngularTS application with Closure ADVANCED mode while
  preserving the external browser runtime through generated externs.'
---

Closure Compiler optimizes application JavaScript. AngularTS remains a
separately loaded browser runtime, and its extern file tells Closure which
public names and shapes must not be renamed.

## Set up an application

1. Install `@angular-wave/angular.ts` and Closure Compiler in the application.
2. Load the AngularTS UMD bundle before the compiled application script.
3. Pass the package's `externs/angular.js` file to Closure.
4. Register modules, controllers, components, and services in normal application
   code.

```html
<script src="/node_modules/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
<script src="/dist/application.js"></script>
```

Use the repository integration as an executable reference:

```bash
make -f integrations/closure/Makefile closure-validate
make -f integrations/closure/Makefile closure-build
make -f integrations/closure/Makefile closure-test
```

## Best practices

- Treat `externs/angular.js` as generated input; never patch it manually.
- Promote Closure warnings to errors and test with ADVANCED mode in CI.
- Keep AngularTS external instead of bundling a second runtime copy.
- Access only documented public members so extern generation can protect them.
- Regenerate and validate externs whenever the public namespace changes.

## Executable evidence

The maintained example or acceptance test is
\`integrations/closure/demo/index.html\`. See
[Executable integration examples](../examples/) for the aggregate validation
workflow.
