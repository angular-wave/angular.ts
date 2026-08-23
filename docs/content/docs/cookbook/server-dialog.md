---
title: Load a dialog from the server
description: Swap server-rendered dialog content and restore focus on close
weight: 31
---

## Problem

A confirmation dialog needs current server data, but its trigger must keep focus
and remain usable if loading fails.

## Before you start

The trigger must remain in the DOM while the fragment is open. The server
fragment owns its accessible title, initial focus, close behavior, and
authorization result.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<button
  ng-el="dialogTrigger"
  ng-get="/account/delete-dialog"
  data-target="#dialog-host"
  swap="innerHTML"
  on-error="dialogError = $res.message"
>
  Delete account
</button>
<div id="dialog-host"></div>
<p ng-if="dialogError">{{ dialogError }}</p>
```

## Server contract

Return a labelled dialog fragment with a focused cancel button. Its close action
calls `dialogTrigger.focus()` before removing the fragment. Return `403` JSON
when the current user may no longer perform the action.

## What AngularTS wires

The response is inserted and compiled in the trigger's scope, so the fragment
can use `dialogTrigger`, event directives, validation, and another HTTP
directive.

## Failure path

Keep the trigger in place while loading and failure occur. The fragment must
trap focus when modal, close on Escape, restore focus, and expose a visible
title.

## Apply it now

Choose one modal whose content is stale or duplicated in client code. Move its
title, warning, and authorization decision to one fragment endpoint.

## Verify

Open by keyboard, cancel, reopen, reject authorization, and complete the action.
Confirm focus always returns to the trigger and the background is not
interactive.
