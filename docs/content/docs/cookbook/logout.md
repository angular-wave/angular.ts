---
title: Log out with a state-changing form
description: End the server session, clear private state, and avoid logout links
weight: 57
---

## Problem

Logout is implemented as a GET link or only clears browser state, leaving the
server session active or allowing unwanted cross-site logout requests.

## Before you start

Provide a server `POST` endpoint that invalidates the session and rotates relevant
credentials. Decide which private caches and client state must be discarded.

## Submit logout as a protected form

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  action="/logout"
  method="post"
  ng-post="/logout"
  data-state-success="signed-out"
>
  <input
    type="hidden"
    name="csrf_token"
    value="SERVER_RENDERED_TOKEN"
  />
  <button type="submit">Log out</button>
</form>
```

The normal form works without client routing. The enhanced form can enter a
public signed-out state after the server confirms invalidation.

## Server contract

Invalidate the session, clear or expire authentication cookies, and return a
public response. Make repeated logout safe. Never use GET for this state change.

## Failure path

If the server cannot confirm logout, do not claim the session ended. Avoid keeping
private response data in a cache that another signed-in user can inherit.

## Apply it now

Inspect the current logout request and subsequent Back navigation. Remove any
private page or cached data that remains usable after a confirmed logout.

## Verify

Log out normally and with AngularTS, repeat the request, use Back, open a private
URL, and sign in as another user in the same browser.
