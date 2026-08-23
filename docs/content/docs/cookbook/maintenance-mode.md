---
title: Keep a useful page during planned maintenance
description: Return a clear 503 response while preserving public navigation and recovery
weight: 64
---

## Problem

A deployment or dependency outage turns the application into an indefinite
spinner, proxy error, or misleading authentication failure.

## Before you start

Prepare a small server-rendered maintenance page that does not depend on the
database or application service being maintained.

## Return the correct temporary status

Use `503 Service Unavailable` and a realistic `Retry-After` header. Explain what
is unavailable, whether existing data is safe, and when the user should retry.
Keep status and support links on dependencies that remain available.

## Server contract

Health and load-balancer behavior must remove unhealthy instances without caching
the maintenance page as a permanent success. Static assets required by the page
must remain reachable or be embedded conservatively.

## Failure path

Do not return `200` for a failed application page, redirect repeatedly, or expose
deployment details. Avoid automatic browser retries that create a recovery surge.

## Apply it now

Open the application with its database unavailable in a production-like setup.
Replace the first raw failure with the smallest dependable maintenance response.

## Verify

Test planned maintenance, an unexpected dependency outage, crawler behavior,
cache headers, recovery, and multiple browser tabs retrying together.
