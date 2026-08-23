---
title: Control repeated requests
description: Measure duplicate work, then delay, throttle, cache, or cancel it
weight: 38
tested-by:
  - src/directive/http/get.spec.ts
  - src/services/http/http.spec.ts
---

## Problem

Typing, scrolling, hovering, or repeated clicks can start more requests than the
user needs.

## Before you start

Record the interaction in the Network panel. Count requests, transferred bytes,
server time, and stale responses. Do not add request control without seeing the
problem first.

## Choose the smallest control

| What you observe                       | First response                                      |
| -------------------------------------- | --------------------------------------------------- |
| Fast typing starts a request per key   | Add a short delay after input settles               |
| Scroll or resize fires continuously    | Throttle the event                                  |
| The same read repeats unchanged        | Reuse an appropriate public or user-partitioned cache |
| An old search overwrites a newer one   | Reject stale results or cancel the old request      |
| Hover prefetch repeats                 | Guard it with loaded and loading state              |
| Double-click repeats a write           | Disable while pending and make the server idempotent |

Use a promise-valued `$http` `timeout` to cancel an obsolete programmatic
request. Treat `xhrStatus === "abort"` as cancellation rather than a server
failure. HTTP directive flows should usually prevent another trigger while the
current request is pending instead of creating custom cancellation code.

## Server contract

Search and list endpoints must tolerate reordered reads. Write endpoints must
protect against duplicate effects with an idempotency key, version, or another
server-side rule when repetition could charge, send, or mutate twice.

## Failure path

Always clear loading state after success, error, or cancellation. Never cache an
authorization failure or leak user-specific data through a shared cache.

## Apply it now

Find the noisiest interaction in the Network panel. Apply only the first matching
row, then measure it again before combining techniques.

## Verify

Trigger the interaction rapidly, use a slow network profile, and force responses
to arrive out of order. Confirm the newest intent wins and writes happen once.
