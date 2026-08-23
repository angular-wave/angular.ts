---
title: Handle two people editing the same record
description: Detect stale updates and let the user compare the current server value
weight: 42
---

## Problem

One person can overwrite a change saved by someone else while both are editing
the same record.

## Before you start

Give each record a version, revision, or strong ETag. Require the client to send
the version it originally loaded with every update.

## Send the version with the edit

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/put.spec.ts -->

```html
<form
  ng-put="/api/articles/42"
  on-success="article = $res; conflict = undefined"
  on-error="conflict = $res"
>
  <input name="version" type="hidden" value="{{ article.version }}" />
  <label>
    Title
    <input name="title" value="{{ article.title }}" required />
  </label>
  <button type="submit">Save article</button>
  <aside ng-if="conflict.current">
    <p>Someone saved a newer version: {{ conflict.current.title }}</p>
    <button
      type="button"
      ng-click="article = conflict.current; conflict = undefined"
    >
      Load newer version
    </button>
  </aside>
</form>
```

## Server contract

Update only when the submitted version matches the stored version. Otherwise
return `409` with a safe representation of the current record. Increment the
version atomically with the successful update.

## Failure path

Do not silently retry a conflicting write. Preserve the user's draft while
showing the current server value so they can compare or merge intentionally.

## Apply it now

Add a version check to one record that is commonly edited by multiple people.
Start with content, inventory, scheduling, or permission records.

## Verify

Open the same record in two sessions. Save different values in both and confirm
the second save receives `409` without overwriting the first.
