---
title: Add Content Security Policy in report-only mode
description: Measure executable-content dependencies before enforcing a restrictive policy
weight: 69
---

## Problem

The application has no browser policy limiting where scripts, styles, frames, and
connections may come from.

## Before you start

Inventory real production resources and choose a report endpoint that removes
sensitive URL and user data before storage.

## Start by observing

Send `Content-Security-Policy-Report-Only` from the server. Begin with narrow
directives for `default-src`, `script-src`, `style-src`, `img-src`, `font-src`,
`connect-src`, `frame-ancestors`, `base-uri`, and `form-action`. Use nonces or
hashes for deliberate inline content instead of broad unsafe allowances.

## Server contract

Generate a fresh nonce per response when used, attach it only to trusted server
scripts, and keep the policy consistent across normal, error, login, and
maintenance pages.

## Failure path

Do not copy a restrictive example directly into enforcement. Missing origins can
break authentication, uploads, workers, WebTransport, or error reporting.

## Apply it now

Run report-only policy on one production route, classify every violation, and
remove unnecessary resource origins before adding exceptions.

## Verify

Exercise every application feature, browser extension noise, errors, and signed-out
pages. Enforce only after expected traffic produces no unexplained violations.
