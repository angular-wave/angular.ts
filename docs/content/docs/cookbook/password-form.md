---
title: Build a password-manager-friendly sign-in form
description: Use normal controls and autocomplete values before adding custom behavior
weight: 71
---

## Problem

Custom sign-in controls prevent password managers, keyboard submission, or browser
security features from recognizing the form.

## Before you start

Use a normal server `POST` endpoint over HTTPS. Keep labels, control names, and a
submit button in the document.

## Use standard autocomplete semantics

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form action="/login" method="post" ng-post="/login" on-error="errors = $res">
  <label>
    Email
    <input name="email" type="email" autocomplete="username" required />
  </label>
  <label>
    Password
    <input
      name="password"
      type="password"
      autocomplete="current-password"
      required
    />
  </label>
  <p ng-if="errors.message" role="alert">{{ errors.message }}</p>
  <button type="submit">Sign in</button>
</form>
```

## Server contract

Use a generic authentication error, rate-limit abuse, rotate the session after
success, and keep account recovery separate. New-password forms use
`autocomplete="new-password"`.

## Failure path

Do not disable paste, invent text controls that imitate passwords, reveal whether
an account exists, or clear the username after a failed attempt.

## Apply it now

Run the sign-in form with a browser password manager and keyboard only. Remove
custom behavior that blocks recognition or submission.

## Verify

Test saved credentials, multiple accounts, failed login, Enter submission,
password reveal controls, and sign-in with JavaScript disabled.
