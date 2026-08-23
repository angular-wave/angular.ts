---
title: Run slow work as a background job
description: Start work quickly, expose status, and download the finished result
weight: 50
---

## Problem

A report, import, or media conversion takes too long for one request and becomes
fragile behind browser, proxy, or deployment timeouts.

## Before you start

Give the job a durable ID, owner, state, progress value, and expiry policy. Make
starting the same job twice safe when duplicate work would be expensive.

## Start the job, then ask for status

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<section>
  <form ng-post="/api/exports" on-success="job = $res">
    <label>
      Format
      <select name="format"><option value="csv">CSV</option></select>
    </label>
    <button type="submit">Create export</button>
  </form>
  <div ng-if="job">
    <p>Status: {{ job.status }}</p>
    <button
      type="button"
      ng-get="/api/exports/current"
      on-success="job = $res"
    >
      Refresh status
    </button>
    <a ng-if="job.downloadUrl" href="{{ job.downloadUrl }}">Download</a>
  </div>
</section>
```

Use manual refresh first. Add measured polling or server-sent events only when
the user benefits from continuous progress.

## Server contract

Return `202` with the accepted job representation. The status endpoint returns
queued, running, completed, failed, or cancelled. Authorize status and download
URLs against the job owner on every request.

## Failure path

Keep a failed job record with a safe explanation and request ID. Do not expose
worker stack traces or leave failed uploads and generated files indefinitely.

## Apply it now

Find the longest request in production traces. Move it to a job when its work can
continue independently of the browser connection.

## Verify

Test duplicate starts, worker restart, cancellation, failure, expiry, another
user's job ID, and download after completion.
