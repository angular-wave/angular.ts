---
title: 'Choose an integration'
linkTitle: 'Choose an integration'
weight: 10
description:
  'Choose a language binding and understand how it works with the AngularTS
  runtime.'
---

## What stays the same

An integration changes the language used to register AngularTS features. It
does not introduce a second module system or component lifecycle. Modules,
injection, components, directives, scopes, templates, and services behave the
same way.

## Choose by language

Use the binding for the language that produces your client-side code:

- Closure JavaScript uses the extern file from the npm package.
- ClojureScript, Java/J2CL, and Scala.js use Maven Central artifacts.
- Dart uses pub.dev.
- Gleam uses Hex.
- Kotlin and the WebAssembly languages currently use source dependencies.

Every integration still needs `@angular-wave/angular.ts` on the page. Load it
once and keep its version equal to the language binding version.

## Start from a complete project

Open the guide for your language, install its required compiler, and begin with
the linked [todo project]({{< relref "/docs/integrations/examples" >}}). The
example shows the dependency, entry point, page, build output, and AngularTS
startup together.
