---
title: Return users safely after sign-in
description: Preserve a destination without creating an open redirect
weight: 65
---

## Problem

The login flow accepts an arbitrary return URL, allowing attackers to send users
from a trusted sign-in page to a malicious site.

## Before you start

Prefer a server-side return target stored in the session. If a destination must
travel through the form, restrict it to known local routes or an allowlist.

## Submit a local destination

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form action="/login" method="post" ng-post="/login" on-error="errors = $res">
  <input name="return_to" type="hidden" value="/account/orders" />
  <label>Email <input name="email" type="email" autocomplete="username" /></label>
  <label>
    Password
    <input name="password" type="password" autocomplete="current-password" />
  </label>
  <button type="submit">Sign in</button>
</form>
```

## Server contract

Resolve the destination against an allowlist or accept only normalized local
paths. Reject protocol-relative URLs, encoded scheme tricks, control characters,
and destinations outside the application.

## Failure path

Use a safe default page when the destination is missing or invalid. Never copy an
unchecked query or form value into the redirect response header.

## Apply it now

Trace every `return`, `next`, `redirect`, and `continue` parameter to the server
code that validates its final destination.

## Verify

Test a valid local path, absolute external URL, `//host`, encoded separators,
backslashes, and nested redirect parameters.
