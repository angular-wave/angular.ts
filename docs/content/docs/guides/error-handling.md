---
title: Handle errors
weight: 50
description:
  Classify AngularTS domain, transport, transition, and programming failures and
  give each one the correct owner.
---

## Classify before rendering

- Validation and domain rejection are expected outcomes near the action.
- HTTP timeout, abort, offline, and non-success status belong to the request
  owner.
- Route resolve failure belongs to transition policy.
- Unexpected exceptions belong to `$exceptionHandler` and diagnostics.

Do not convert every rejection to `[]`, `null`, or `false`. That destroys
information and commonly renders an empty success state after a real failure.

Wrap low-level errors with the operation name while retaining the original
cause. The UI should receive a stable category and recovery action, not a stack
trace or server payload. Logs may include release, route, operation, and
correlation identifiers but must exclude credentials and private data.

A repository may retry a safe idempotent read. A component should own the retry
button. Global interceptors should refresh credentials or normalize protocol
behavior, not retry every request indiscriminately.

Unexpected exceptions should reach the
[`$exceptionHandler` reference](/docs/service/exceptionHandler/). Test that
expected failures remain recoverable and unexpected exceptions are reported.
