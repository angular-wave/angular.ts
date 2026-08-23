---
title: Protect a cookie-authenticated form from CSRF
description: Send a server-issued proof with every state-changing form request
weight: 40
---

## Problem

A form uses authentication cookies, so another site may be able to cause the
browser to send an unwanted state-changing request.

## Before you start

Configure CSRF protection on the server. Generate a token tied to the user or
session and render it into the page. Cookie `SameSite` settings help, but they do
not replace server-side CSRF validation.

## Submit the server-issued token

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/post.spec.ts -->

```html
<form ng-post="/account/email" on-error="errors = $res">
  <input
    type="hidden"
    name="csrf_token"
    value="SERVER_RENDERED_TOKEN"
  />
  <label>
    New email
    <input name="email" type="email" required />
  </label>
  <button type="submit">Change email</button>
</form>
```

Replace `SERVER_RENDERED_TOKEN` in the server template. AngularTS serializes the
named hidden control with the rest of the form; the server validates it before
changing state.

## Server contract

Reject a missing, expired, or mismatched token without performing the operation.
Rotate tokens according to the server framework's policy and compare them using
its maintained CSRF implementation rather than custom cryptography.

## Failure path

Return a safe `403` response when the proof fails. Do not automatically retry the
write because a fresh token may require a new authenticated page response.

## Apply it now

Inspect every cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` endpoint.
Start with account, payment, and permission changes.

## Verify

Send the request with the valid token, no token, a token from another session,
and an expired token. Confirm only the valid request changes state.
