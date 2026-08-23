---
title: Focus the first field rejected by the server
description: Move keyboard users directly to a field-level validation problem
weight: 73
---

## Problem

The server returns validation errors below the visible area and keyboard users do
not know which control needs attention.

## Before you start

Expose important controls with `ng-el` and return field errors using control names.
Focus only after the failed response, not while the user is typing.

## Focus a known field after rejection

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/el/el.spec.ts -->

```html
<form
  ng-post="/account/profile"
  on-error="errors = $res; emailInput.focus()"
>
  <label>
    Email
    <input ng-el="emailInput" name="email" type="email" required />
  </label>
  <p ng-if="errors.email" id="email-error">{{ errors.email }}</p>
  <button type="submit">Save profile</button>
</form>
```

For several fields, let the response handler choose the first rejected control in
document order. Keep the visible message associated with its input.

## Server contract

Return stable field names and safe messages with `422`. Form-level failures must
target a form summary rather than an arbitrary input.

## Failure path

Do not steal focus for background refreshes or move it repeatedly as messages
render. If the control is hidden, reveal it before focusing.

## Apply it now

Submit the longest form from its last field and note where focus remains. Move it
to the first actionable server error.

## Verify

Use keyboard and screen reader navigation with one error, several errors, a hidden
section, and a form-level server failure.
