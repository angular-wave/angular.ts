---
title: Archive first and offer restore
description: Make a destructive-looking action recoverable when the domain allows it
weight: 54
---

## Problem

Users need to remove an item from active work, but permanent deletion is too easy
to regret.

## Before you start

Model archived state on the server. Define retention, visibility, uniqueness,
restore permissions, and the separate conditions for permanent deletion.

## Keep restore beside the result

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<section ng-init="archived = false">
  <button
    ng-if="!archived"
    type="button"
    ng-post="/api/projects/42/archive"
    on-success="archived = true"
  >
    Archive project
  </button>
  <div ng-if="archived" role="status">
    <p>Project archived.</p>
    <button
      type="button"
      ng-post="/api/projects/42/restore"
      on-success="archived = false"
    >
      Restore
    </button>
  </div>
</section>
```

The page changes only after each server operation succeeds.

## Server contract

Make archive and restore idempotent. Record who changed the state and when. Keep
permanent deletion as a separate, more restricted operation.

## Failure path

If restore fails, keep the archived message and explain the conflict or permission
problem. Do not imply that a client-side undo can reverse a committed server action.

## Apply it now

Replace one permanent delete with archive and restore where legal and operational
requirements allow retention.

## Verify

Archive twice, restore twice, restore after a naming conflict, test another user,
and confirm archived records stay out of active queries.
