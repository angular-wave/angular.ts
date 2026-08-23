---
title: Confirm a destructive action in place
description: Require an explicit second action before sending a delete request
weight: 41
---

## Problem

A single accidental click can delete important data.

## Before you start

Make deletion authorization and resource ownership checks authoritative on the
server. Decide whether the operation is reversible and say so in the interface.

## Ask for a second explicit action

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/delete.spec.ts -->

```html
<article ng-init="confirming = false; deleted = false" ng-if="!deleted">
  <h2>Quarterly report</h2>
  <button type="button" ng-click="confirming = true">Delete</button>
  <div ng-if="confirming" role="alert">
    <p>This permanently deletes the report.</p>
    <button
      type="button"
      ng-delete="/api/reports/42"
      on-success="deleted = true"
      on-error="deleteError = $res"
    >
      Delete permanently
    </button>
    <button type="button" ng-click="confirming = false">Cancel</button>
    <p ng-if="deleteError">{{ deleteError.message }}</p>
  </div>
</article>
```

The first button changes only local state. The second button sends the request
and names the exact consequence.

## Server contract

Return `204` after deletion. Return `404` when the resource no longer exists and
`403` when the user may not delete it. Make repeated deletion safe when possible.

## Failure path

Keep the confirmation visible after failure so the user can read the message or
cancel. Do not remove the item until the server confirms deletion.

## Apply it now

Find the most damaging one-click action in the application and split intent from
execution. Use a specific label such as “Delete report,” not “Yes.”

## Verify

Test keyboard-only confirmation, cancellation, double activation, a missing
resource, and a permission rejection. Confirm only one authorized delete occurs.
