---
title: Harden an authentication session cookie
description: Keep session credentials out of JavaScript and restrict browser delivery
weight: 70
---

## Problem

Authentication state is readable by browser scripts or sent more broadly than
the application requires.

## Before you start

Use the server framework's maintained session implementation. Store only an opaque
session identifier in the browser, not authorization state or personal data.

## Set the cookie at the server

Use `Secure`, `HttpOnly`, and an appropriate `SameSite` value. Keep `Path` and
`Domain` as narrow as the deployment allows. Rotate the session after sign-in and
privilege changes, and expire it on logout.

## Server contract

Validate expiry and revocation on every authenticated request. Protect
state-changing cookie requests from CSRF. Avoid accepting the same credential in
both cookies and URLs.

## Failure path

Do not fall back to local storage when a script cannot read an `HttpOnly` cookie;
that unreadability is the protection. A secure cookie still requires XSS defenses.

## Apply it now

Inspect the production `Set-Cookie` response and one authenticated request. Explain
every attribute and remove any unnecessary domain or lifetime.

## Verify

Test HTTPS, logout, expiry, session rotation, subdomains, cross-site requests, and
an attempted `document.cookie` read.
