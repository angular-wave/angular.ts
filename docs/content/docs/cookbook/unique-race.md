---
title: Handle a uniqueness race on submit
description: Let the database decide uniqueness and return the conflict to the field
weight: 59
---

## Problem

The page checks that a name is available, but another request claims it before
the user submits.

## Before you start

Enforce uniqueness with a database constraint. Availability checks improve
feedback but can never reserve the value unless the server explicitly does so.

## Return the conflict to the field

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/teams" on-error="errors = $res">
  <label ng-class="{ error: errors.slug }">
    Team address
    <input
      name="slug"
      required
      aria-invalid="{{ errors.slug !== undefined }}"
      ng-keyup="errors.slug = undefined"
    />
    <span ng-if="errors.slug">{{ errors.slug }}</span>
  </label>
  <button type="submit">Create team</button>
</form>
```

## Server contract

Attempt the insert and translate the known uniqueness violation into `409` or a
field-oriented `422` body such as `{"slug":"That address is already used"}`.
Do not expose database error text.

## Failure path

Preserve every other form value. Ask the user to choose another value instead of
retrying the same conflicting write automatically.

## Apply it now

Find one pre-submit uniqueness check and confirm the final write still handles a
database constraint violation as an expected outcome.

## Verify

Submit the same value concurrently from two sessions. Confirm one succeeds, one
gets the field error, and no duplicate record is stored.
