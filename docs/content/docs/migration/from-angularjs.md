---
title: 'Migrate from AngularJS'
weight: 10
description:
  'Inventory an AngularJS application, replace removed platform abstractions,
  and move features to AngularTS incrementally.'
---

## Goal

Move an application without treating API familiarity as runtime equivalence.

## Before you start

Add browser-level tests for the workflows that must survive migration. Record
all modules, providers, directives, template syntax, router states, and custom
decorators.

## Migrate in boundaries

1. Start a small independent AngularTS application or island.
2. Move one leaf component and its direct service dependencies.
3. Replace removed abstractions with the documented native or module API.
4. Run behavior tests and inspect console errors.
5. Repeat for shared application code.

AngularTS preserves the HTML-first module, injection, controller, scope,
directive, filter, and two-way-binding mental models. Its runtime is different:
reactive proxies replace digest polling, native promises replace `$q`, native
timers replace timeout abstractions, and native DOM elements replace wrapper
objects.

Require explicit injection annotation during migration. Audit custom directives
for DOM-wrapper assumptions and code that manually starts digest work.

## Next step

Continue with [application structure]({{< relref "/docs/guides/application-structure" >}})
and the [server-first guide]({{< relref "/docs/guides/server-first" >}}). Use
the current service and module references for exact APIs.
