---
title: Find a data correctness recipe
description: Preserve identity, precision, concurrency, validation, and audit history
weight: 86
---

## Represent values correctly

| Problem | Recipe |
| ------- | ------ |
| Keep public IDs unchanged | [Use opaque identifiers]({{< relref "/docs/cookbook/opaque-identifiers" >}}) |
| Preserve currency precision | [Submit money safely]({{< relref "/docs/cookbook/money-values" >}}) |
| Preserve time meaning | [Send dates with zones]({{< relref "/docs/cookbook/dates-time-zones" >}}) |
| Seed initial server values | [Pass server data]({{< relref "/docs/cookbook/server-data" >}}) |

## Protect concurrent changes

| Problem | Recipe |
| ------- | ------ |
| Detect a stale edit | [Handle edit conflicts]({{< relref "/docs/cookbook/edit-conflict" >}}) |
| Handle a unique constraint race | [Return uniqueness errors]({{< relref "/docs/cookbook/unique-race" >}}) |
| Make a write repeatable | [Use idempotency]({{< relref "/docs/cookbook/idempotent-write" >}}) |
| Report partial batch results | [Apply bulk actions]({{< relref "/docs/cookbook/bulk-action" >}}) |

## Preserve history and compatibility

| Problem | Recipe |
| ------- | ------ |
| Keep useful cached records | [Cache reference data]({{< relref "/docs/cookbook/cached-reference-data" >}}) |
| Keep state across an expired session | [Handle session expiration]({{< relref "/docs/cookbook/session-expiration" >}}) |
| Record a sensitive change | [Write an audit trail]({{< relref "/docs/cookbook/audit-trail" >}}) |
| Change a contract safely | [Use a compatible rollout]({{< relref "/docs/cookbook/compatible-rollout" >}}) |
