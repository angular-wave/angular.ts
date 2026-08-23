---
title: Record who changed sensitive data
description: Write an audit event in the same server operation as the state change
weight: 77
---

## Problem

A sensitive record changed, but the application cannot explain who changed what,
when, or through which operation.

## Before you start

Define which domain actions require audit history, who may read it, retention,
redaction, and the difference between audit events and diagnostic logs.

## Ask for context when the domain needs it

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/accounts/42/suspend" on-error="errors = $res">
  <label>
    Reason for suspension
    <textarea name="reason" required></textarea>
  </label>
  <button type="submit">Suspend account</button>
</form>
```

## Server contract

Derive actor, tenant, request ID, time, and affected resource on the server. Record
the domain action and safe before-and-after facts in the same transaction or a
reliable transactional outbox.

## Failure path

Do not trust actor or timestamp fields from the form. Avoid placing credentials,
unbounded record snapshots, or unnecessary personal data in the audit event.

## Apply it now

Choose one permission, billing, account, or data-export action and prove its state
change cannot commit without its required audit event.

## Verify

Test success, transaction rollback, retry, impersonation where supported, redaction,
retention, and unauthorized audit-log access.
