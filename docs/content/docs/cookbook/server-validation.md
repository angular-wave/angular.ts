---
title: Show validation errors returned by the server
description: Keep validation authoritative on the server and render field errors in place
weight: 39
---

## Problem

A form needs immediate, useful errors without duplicating the server's validation
rules in browser code.

## Before you start

Make the endpoint return `422` with a JSON object whose keys match form control
names. Use short messages that are safe to show directly to the user.

## Render the error object

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/post.spec.ts -->

```html
<form
  ng-post="/account/profile"
  on-success="profile = $res; errors = {}"
  on-error="errors = $res"
>
  <label ng-class="{ error: errors.email }">
    Email
    <input
      name="email"
      type="email"
      value="{{ profile.email }}"
      aria-invalid="{{ errors.email !== undefined }}"
      ng-keyup="errors.email = undefined"
    />
    <span ng-if="errors.email">{{ errors.email }}</span>
  </label>
  <button type="submit">Save profile</button>
</form>
```

The same error object drives the message, error class, and accessibility state.
Browser validation can improve feedback, but the server still checks every value.

## Server contract

Return the saved profile with `2xx`. Return a body such as
`{"email":"Use a work email address"}` with `422` for correctable input.
Reserve `401`, `403`, `409`, and `5xx` for their distinct meanings.

## Failure path

If an error is not a field error, show a form-level message instead of assigning
it to an unrelated control. Never return stack traces or database messages.

## Apply it now

Pick one form that reimplements server validation in JavaScript. Make the server
return named errors and bind those errors beside the matching controls.

## Verify

Submit empty, malformed, duplicate, unauthorized, and valid values. Confirm the
right field is identified and keyboard focus remains usable after every response.
