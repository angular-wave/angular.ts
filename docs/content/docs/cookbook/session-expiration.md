---
title: Return users to login after a session expires
description:
  Route a failed private request and preserve the intended destination
weight: 28
---

## Problem

A user opens a private action after their cookie session expires. The
application must show login rather than leaving a broken panel.

## Before you start

Register the login router state and configure the request credential transport.
Decide how the login flow stores and restores the intended destination.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<section>
  <button
    ng-get="/api/account"
    on-success="account = $res"
    on-error="sessionError = $res.message"
    data-state-error="login"
  >
    Refresh account
  </button>
  <p ng-if="sessionError">{{ sessionError }}</p>
</section>
```

## Server contract

The private endpoint returns `401` with `{"message":"Your session expired"}`.
The login state records the intended state and returns there after successful
login.

## What AngularTS wires

The directive exposes the JSON error and asks the router to enter `login`.
Configure cookie credentials and route policy once; do not add auth logic to
every button.

## Failure path

`data-state-error` runs for every failed status, not only `401`. Use this direct
pattern only for an endpoint whose failures all require login; otherwise
centralize status-aware handling in the HTTP or security layer.

## Apply it now

Expire a real session, then activate one private request and one private URL.
Decide where the intended destination is stored and which failures should not
route to login.

## Verify

Confirm the login page appears, credentials are not placed in URLs or logs, and
a successful login returns to the original destination exactly once.
