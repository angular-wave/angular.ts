---
title: 'Choose and use an integration'
linkTitle: 'Integration model'
weight: 10
description:
  'Understand the boundary between the shared browser runtime and
  language-specific bindings before selecting an integration.'
---

## Goal

Choose an integration without learning a second AngularTS architecture.

## Before you start

Complete [how AngularTS
works]({{< relref "/docs/get-started/how-angular-works" >}}). The integration
changes language syntax, not modules, injection, components, directives, scopes,
or view lifecycle.

## Select by application toolchain

Use the binding for the language that produces your browser application. Load
the AngularTS runtime exactly once. Treat generated namespaces and externs as
build inputs; do not edit generated files by hand.

Check the integration directory for its package manager, compiler version, and
runtime-test command. Public namespace parity checks ensure that newly shipped
types are either represented by the integration or deliberately classified.

Typed component views retain the same controller, host, scope, required
controllers, transclusion, reactive reader, collection, and cleanup concepts.
Language wrappers may use idiomatic names or helper builders for those values.

## Next step

Open the README and examples under your selected `integrations/<language>`
directory, then run that integration's `make check` before changing bindings.
