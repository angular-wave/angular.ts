---
title: 'Closure Compiler'
weight: 20
description:
  'Compile AngularTS code with Closure ADVANCED optimization while preserving
  runtime API names through the packaged extern file.'
---

Closure Compiler optimizes your JavaScript. AngularTS stays outside that output,
and its extern file tells Closure which public names must not be renamed.

## Install

Install `@angular-wave/angular.ts` and Closure Compiler in the application.
Pass `dist/externs/angular.js` from the npm package to Closure, and compile the
production output with ADVANCED optimization.

Load `dist/angular-ts.umd.min.js` before the compiled application file:

```html
<script src="/node_modules/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
<script src="/dist/application.js"></script>
```

## Production guidance

- Treat the packaged extern as part of the AngularTS version; do not edit it.
- Promote Closure warnings to errors.
- Keep AngularTS external so the page loads only one runtime.
- Use documented public APIs so Closure can preserve every accessed member.
- Test the ADVANCED output, not only uncompiled source.

## Complete example

Use `integrations/closure/demo` as a complete todo project, or browse all
[integration examples](../examples/).
