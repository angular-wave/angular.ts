---
title: Error and symptom catalog
description:
  Diagnose common AngularTS bootstrap, injection, rendering, routing, and
  integration failures.
weight: 20
---

## Application does not bootstrap

Check that the bootstrapped module name matches the registered module, the root
exists, and AngularTS is loaded once. Do not bootstrap on `ng-if`, `ng-include`,
or `ng-view`.

## Unknown provider or injection token

Confirm the provider is registered before use, its module is in the dependency
graph, and the token spelling is correct. Regenerate language bindings after
changing the public namespace.

## State changed but the view did not

Read the value through a reactive binding. In typed views, use a reader such as
`() => controller.value`. In keyed collections, call the item reader.

## A collection row is recreated

Use stable domain keys. Do not key mutable records by array position when
insertion, removal, or sorting is possible.

## Navigation succeeds but no view appears

Confirm an `ng-view` outlet exists, the state names a registered component or
template, and parent/child names match the declaration.

## Sanitization or CSP blocks content

Review the boundary instead of disabling security. Identify the source, expected
sink, and smallest safe trust policy.

## Generated integration files are stale

Run the integration's generation command and aggregate integration validation.
Never hand-edit generated bindings, externs, or parity artifacts.

## Browser capability is missing

Detect optional APIs before constructing a service. Select a fallback and show
an actionable unsupported state when none exists.

Continue with [Troubleshooting](/docs/guides/troubleshooting/).
