---
title: Apply one action to several records
description: Submit explicit selections and return a result for every record
weight: 53
---

## Problem

Users need to update several records without opening and submitting each one
individually.

## Before you start

Choose a maximum batch size. Authorize every selected record independently and
decide whether the operation is atomic or may partially succeed.

## Submit explicit selected controls

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/tasks/archive" on-success="result = $res">
  <fieldset>
    <legend>Tasks to archive</legend>
    <label><input name="task_42" type="checkbox" /> Draft invoice</label>
    <label><input name="task_43" type="checkbox" /> Review contract</label>
  </fieldset>
  <button type="submit">Archive selected tasks</button>
  <p ng-if="result">Archived {{ result.archived }} tasks.</p>
  <ul><li ng-repeat="error in result.errors">{{ error.message }}</li></ul>
</form>
```

Named controls make the submitted selection inspectable in the Network panel.
For dynamic lists, use the server's documented array representation consistently.

## Server contract

Return a count and per-record failures. If partial success is allowed, make the
response identify exactly which records changed. If it must be atomic, perform
all authorization and validation before committing any record.

## Failure path

Do not report the whole batch as successful when some records failed. Preserve
failed selections so the user can correct or retry them.

## Apply it now

Find a repetitive list action and define its batch limit, authorization rule,
transaction behavior, and response before adding selection controls.

## Verify

Test no selection, the maximum size, duplicates, mixed permissions, missing
records, partial failure, and a repeated submission.
