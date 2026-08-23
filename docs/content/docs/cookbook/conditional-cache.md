---
title: Revalidate a cached response with ETag
description: Return 304 when unchanged instead of transferring the same representation
weight: 63
---

## Problem

The browser repeatedly downloads a response that rarely changes.

## Before you start

Confirm the request is safe and cacheable. Decide whether the representation is
public, user-specific, or private before choosing cache headers.

## Let HTTP perform revalidation

Return a stable strong or weak `ETag` with the representation. On a later request,
compare `If-None-Match` and return `304` without a body when it still matches.
Normal navigation and standards-based HTTP clients can then reuse cached bytes.

## Server contract

Change the ETag whenever the selected representation changes. Send appropriate
`Cache-Control` and `Vary` headers. Partition authenticated content and never mark
private user data as shared public cache content.

## Failure path

Do not use `304` when authorization changed or when the selected representation
differs by language, encoding, origin, or user and the cache key ignores it.

## Apply it now

Use the Network panel to find the largest repeated unchanged read. Add validators
at its server renderer before introducing a custom application cache.

## Verify

Request once, revalidate, change the record, and revalidate again. Confirm `304`
only while the body is unchanged and no private response crosses users.
