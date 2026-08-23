---
title: Find a security recipe
description: Protect requests, sessions, redirects, content, credentials, and permissions
weight: 84
---

## Protect server operations

| Problem | Recipe |
| ------- | ------ |
| Audit a complete interaction | [Run the security audit]({{< relref "/docs/cookbook/secure-request" >}}) |
| Protect cookie-authenticated writes | [Send CSRF proof]({{< relref "/docs/cookbook/csrf-protected-form" >}}) |
| Enforce current permissions | [Handle permission rejection]({{< relref "/docs/cookbook/permission-denied" >}}) |
| Prevent duplicate critical writes | [Use idempotency]({{< relref "/docs/cookbook/idempotent-write" >}}) |
| End an authenticated session | [Log out safely]({{< relref "/docs/cookbook/logout" >}}) |

## Protect browser content

| Problem | Recipe |
| ------- | ------ |
| Validate a return destination | [Prevent open redirects]({{< relref "/docs/cookbook/safe-redirect" >}}) |
| Render user-authored formatting | [Sanitize rich text]({{< relref "/docs/cookbook/rich-text" >}}) |
| Restrict executable resources | [Deploy Content Security Policy]({{< relref "/docs/cookbook/content-security-policy" >}}) |
| Restrict session delivery | [Harden session cookies]({{< relref "/docs/cookbook/session-cookie" >}}) |
| Remove credentials from diagnostics | [Redact secrets]({{< relref "/docs/cookbook/secret-redaction" >}}) |

## Protect destructive actions

| Problem | Recipe |
| ------- | ------ |
| Confirm permanent removal | [Confirm deletion]({{< relref "/docs/cookbook/confirm-delete" >}}) |
| Prefer a reversible operation | [Archive and restore]({{< relref "/docs/cookbook/archive-restore" >}}) |
