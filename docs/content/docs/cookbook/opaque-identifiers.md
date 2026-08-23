---
title: Keep identifiers as opaque strings
description: Avoid rounding, parsing, and leaking meaning through record IDs
weight: 62
---

## Problem

A large numeric ID is rounded in JavaScript or application code starts depending
on structure that should be private to the server.

## Before you start

Define public identifiers as strings even when the database uses numbers. Treat
them as labels, not values for arithmetic or ordering.

## Submit the identifier unchanged

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/invitations" on-error="errors = $res">
  <input
    name="accountId"
    type="hidden"
    value="acct_9007199254740993"
  />
  <label>Email <input name="email" type="email" required /></label>
  <button type="submit">Invite</button>
</form>
```

## Server contract

Accept and return the identifier as a string. Validate its syntax, then authorize
the referenced resource independently. An unguessable ID is not permission.

## Failure path

Reject malformed IDs without coercing them. Avoid messages that reveal private
resource existence when the requester lacks access.

## Apply it now

Search one API response for identifier fields typed as numbers. Convert public
IDs to strings before they cross the server boundary.

## Verify

Round-trip IDs larger than JavaScript's safe integer, leading-zero IDs, UUIDs,
and malformed strings without changing their text.
