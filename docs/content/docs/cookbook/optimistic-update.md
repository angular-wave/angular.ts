---
title: Update immediately and roll back on failure
description:
  Show a local change first while preserving the previous server value
weight: 27
---

## Problem

A reversible action such as completing a task should feel immediate, but a
rejected request must restore the last confirmed value.

## Before you start

Choose a reversible, low-risk action and retain the last confirmed server value.
The endpoint must return the canonical value or a clear conflict response.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  ng-init='task = {"id":42,"complete":false}; confirmed = false'
  ng-put="/api/tasks/{{ task.id }}"
  on-success="task = $res; confirmed = $res.complete; saveError = undefined"
  on-error="task.complete = confirmed; saveError = $res.message"
>
  <label>
    <input name="complete" type="checkbox" ng-model="task.complete" />
    Complete
  </label>
  <button type="submit">Save</button>
  <span ng-if="saveError">{{ saveError }}</span>
</form>
```

## Server contract

Return the canonical task after success. Return `409 Conflict` with
`{"message":"Task changed on another device"}` when the submitted version is
stale.

## What AngularTS wires

The checkbox updates local rendering immediately. `confirmed` changes only after
a successful response and supplies the rollback value after failure.

## Failure path

Use optimism only for reversible changes. Payments, destructive operations, and
permission changes should wait for server confirmation.

## Apply it now

Choose one low-risk action that currently waits on the network. Name the
confirmed value, the optimistic value, and the exact response that requires
rollback.

## Verify

Test success, offline failure, and conflict. Confirm rollback uses the last
confirmed server value rather than a guessed default.
