---
title: Design an HTTP response for the UI
description: Choose status, content type, and body before writing the directive
weight: 33
---

## Problem

A directive can only handle success, validation, navigation, and swaps correctly
when the server response has a deliberate contract.

## Before you start

Choose whether the server or browser renders the result. Write down what the user
should see after success, invalid input, expired authentication, conflict, and
unexpected failure.

## Choose the response

| Situation                         | Response contract                                      |
| --------------------------------- | ------------------------------------------------------ |
| Saved data is needed locally      | `2xx application/json` with the canonical saved record |
| Only success matters              | `204 No Content`                                       |
| Server owns the replacement UI    | `2xx text/html` with one fragment                      |
| User can correct submitted values | `422 application/json` keyed by field name             |
| Authentication expired            | `401 application/json` with a safe user message        |
| User lacks permission             | `403 application/json`                                 |
| Submitted version is stale        | `409 application/json` with conflict details           |
| Server failed unexpectedly        | `5xx application/json` with a public message ID        |

Use `on-success` or `on-error` for JSON. Use `data-target` and `swap` for HTML.
Do not return HTML error pages to a JSON interaction or `200` for rejected form
data merely to avoid the error path.

## Failure path

Never expose stack traces, database errors, tokens, or internal identifiers in a
public error body. Log a correlation ID on the server and return only that ID
with a safe message.

## Apply it now

Choose one endpoint used by a cookbook recipe. Write its method, URL, success
status, success content type, failure statuses, and one real body for each path
before changing the template.

## Verify

Inspect every response in the Network panel. Confirm its status and content type
match the body, an empty success is actually empty, and each failure reaches the
intended UI path.
