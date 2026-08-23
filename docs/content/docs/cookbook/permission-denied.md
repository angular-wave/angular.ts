---
title: Handle a permission rejection without hiding it
description: Let the server decide access and give the user a useful next step
weight: 55
---

## Problem

The interface hides controls based on known permissions, but permissions can
change and direct or stale requests still reach the server.

## Before you start

Authorize every operation on the server using the authenticated user and current
resource. Client visibility is presentation, not enforcement.

## Render the server rejection

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  ng-put="/api/team/42/settings"
  on-success="settings = $res; accessError = undefined"
  on-error="accessError = $res"
>
  <label>
    Team name
    <input name="name" value="{{ settings.name }}" required />
  </label>
  <button type="submit">Save settings</button>
  <p ng-if="accessError" role="alert">
    {{ accessError.message }}
  </p>
</form>
```

A disabled or hidden button can reduce confusion when permission is already
known, but the rejection path remains necessary.

## Server contract

Return `401` when authentication is missing and `403` when the authenticated user
lacks permission. Keep the message safe when even resource existence is private.

## Failure path

Do not redirect every `403` to login; signing in again cannot grant a missing
permission. Offer a useful next step such as returning, requesting access, or
contacting an administrator.

## Apply it now

Open one privileged action in two sessions, remove permission in one, and submit
the stale form in the other. Make the resulting rejection understandable.

## Verify

Test signed out, wrong role, wrong tenant, removed permission, deleted resource,
and authorized access. Confirm no rejected request changes state.
