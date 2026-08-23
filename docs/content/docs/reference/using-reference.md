---
title: 'How to use the API reference'
weight: 10
description:
  'Read directive syntax, injection tokens, TypeScript signatures, optional
  values, unions, callbacks, and lifecycle contracts.'
---

## Find the API category

An `ng-*` HTML name is usually a directive. A name injected into a function is a
service or value token. A capitalized TypeScript name is a generated type.

## Read a TypeScript signature

`value?: string` means the property is optional and, when supplied, must be a
string. `string | null` means either value is accepted. `() => void` means a
function takes no arguments and returns no useful value. `Array<T>` means an
array whose items have type `T`.

## Check lifecycle and ownership

Before using an API, determine when it is created, when callbacks run, and who
releases listeners or resources. Component, directive, scope, route, and
application lifetimes are different.

## Prefer the public contract

Use exported package members, documented injection tokens, and generated TypeDoc
pages. Names marked internal, generated DOM details, and implementation files
are not application contracts.

## Return to a guide

Once you find the exact signature, use the linked task or concept page to see
the API in an application workflow.
