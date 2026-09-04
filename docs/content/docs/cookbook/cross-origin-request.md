---
title: Keep requests same-origin unless they must cross origins
description: Configure CORS and credentials deliberately for a separate API origin
weight: 58
---

## Problem

The page and API use different origins, introducing preflight,
credential, cookie, caching, and deployment behavior that same-origin requests
avoid.

## Before you start

Ask whether the application server can proxy the API under the page's origin.
Prefer that simpler setup unless direct browser access to the other origin is a
real requirement.

## Configure the server, not the browser workaround

Allow only known application origins, required methods, and required headers.
When cookies are involved, use explicit origins and credentials; wildcard origin
responses cannot safely represent authenticated access. Keep CSRF protection for
cookie-authenticated state changes.

## Server contract

Handle preflight requests consistently, vary cached responses by origin when
needed, and return the same authorization and validation statuses as a same-origin
endpoint. Treat CORS as browser access policy, not user authorization.

## Failure path

Do not disable browser security, reflect arbitrary `Origin` values, put secrets
in URLs, or convert a CORS failure into a JSONP-style executable response.

## Apply it now

List every production origin that can call the API and every credential it sends.
Remove unused origins, headers, and methods from the server policy.

## Verify

Test the allowed production origin, an unlisted origin, preflight, credentials,
cache behavior, and a state-changing request without CSRF proof.
