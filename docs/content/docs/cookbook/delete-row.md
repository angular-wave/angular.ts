---
title: Delete a row without rebuilding its list
description:
  Let the server authorize deletion and remove only the successful row
weight: 23
---

## Problem

Deleting one item should not recreate the list, lose scroll position, or remove
the row before the server authorizes the action.

## Before you start

The server must authorize deletion and return success only after the record is
gone. Give the rendered row a stable DOM ID that is unique on the page.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<ul>
  <li id="task-42">
    <span>Send invoice</span>
    <button
      ng-delete="/api/tasks/42"
      data-target="#task-42"
      swap="delete"
      on-error="deleteError = $res.message"
    >
      Delete
    </button>
  </li>
</ul>
<p ng-if="deleteError">{{ deleteError }}</p>
```

## Server contract

Return `204 No Content` only after authorization and deletion succeed. Return a
`403` or `409` JSON body such as `{"message":"This task is locked"}` when the
row must remain.

## What AngularTS wires

The click sends `DELETE`. The `delete` swap removes the selected row only after
a successful response. Errors update scope instead of touching the list.

## Failure path

Disable or mark the button while the request runs when duplicate deletion
matters. Always enforce ownership and authorization on the server.

## Apply it now

Find a delete action that refreshes an entire collection. Give each row a stable
DOM ID and make the endpoint return an error that explains why deletion can
fail.

## Verify

Delete the middle row, then reject another deletion. Confirm sibling nodes,
focus, scroll position, and the rejected row remain unchanged.
