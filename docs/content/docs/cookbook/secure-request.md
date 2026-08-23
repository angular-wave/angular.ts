---
title: Audit a server-driven interaction before shipping
description: Check authorization, CSRF, HTML trust, caching, uploads, and errors
weight: 35
---

## Problem

A form or HTTP directive works, but its security depends on decisions spread
between markup, request configuration, the endpoint, and storage.

## Before you start

Choose one real state-changing request. Record its authenticated user, resource,
method, credential transport, response type, cache path, and uploaded content.

## Audit the interaction

| Surface           | Shipping check                                                   |
| ----------------- | ---------------------------------------------------------------- |
| Authorization     | Server verifies this user may act on this resource               |
| Cookie request    | Server validates CSRF protection on every state-changing method  |
| Bearer credential | Token never appears in URL, HTML, storage logs, or error output   |
| HTML response     | Server escapes untrusted values before AngularTS compiles it      |
| JSON error        | Body contains safe field messages, not stack or database details |
| Cache             | Private entries are partitioned and cleared on logout            |
| Upload            | Server checks size, MIME signature, filename, and storage limits |
| Redirect          | Destination is allowlisted rather than copied from user input     |

Client validation, hidden buttons, route policy, and disabled controls improve
the user experience. None of them authorize a server operation.

## Failure path

Use `401` when authentication is missing, `403` when the authenticated user lacks
permission, and `422` for correctable input. Do not turn a security rejection
into a successful response just to simplify the template.

## Apply it now

Capture one real request in the Network panel and answer every row using the
server implementation, not assumptions from the UI. Add a server test for each
answer that can regress.

## Verify

Repeat the request signed out, as another user, without the CSRF proof, with
tampered IDs, with malicious text, and with an oversized upload when applicable.
Confirm every rejection is safe and leaves no unauthorized state change.
