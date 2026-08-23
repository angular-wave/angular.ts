---
title: Understand the similarity to HTMX
description: Compare the server-first approaches without assuming compatibility
weight: 32
---

## Problem

AngularTS HTTP directives look familiar if you know HTMX. You want to understand
the shared approach without assuming the APIs behave alike.

## Before you start

Start with the AngularTS HTTP directive reference. Treat HTMX knowledge as
background for the server-first design, not as documentation for AngularTS.

## Similar design questions

| Design question              | AngularTS mechanism                                        |
| ---------------------------- | ---------------------------------------------------------- |
| Trigger a request            | `ng-get`, `ng-post`, `ng-put`, `ng-delete`, `data-trigger` |
| Choose the destination       | `data-target`                                              |
| Choose insertion behavior    | `swap`                                                     |
| Render a server fragment     | Return HTML; AngularTS inserts and compiles it             |
| Read JSON                    | Assign `$res` in `on-success` or `on-error`                |
| Show request state           | `loading`, `loading-class`, bindings                       |
| Navigate after success       | `data-state-success`                                       |
| Prefetch from intent         | Event trigger plus hidden scope state                      |
| Lazy load near the viewport  | `ng-viewport` plus an HTTP directive                       |
| Keep local interaction state | Scope, controller, or typed component view                 |

## Where the approach feels similar

Both approaches encourage useful questions for click-to-edit, active search,
polling, lazy loading, server validation, fragment swaps, pagination, and
prefetching: who renders the result, what triggers the request, where it goes,
and what failure looks like.

## Do not infer compatibility

AngularTS does not promise HTMX syntax or behavior. It has its own attributes,
scope expressions, lifecycle, router, security configuration, response handling,
and tests. Similar names or outcomes do not make an HTMX example an AngularTS
example.

## Failure path

Do not copy an HTMX attribute, extension, event, header, or history option and
assume AngularTS recognizes it. Build from the AngularTS reference, preserve the
normal server endpoint, and test error and navigation behavior independently.

## Apply it now

Choose one server interaction in your application. Define its trigger, request,
response type, target, local state, fallback, and failure behavior using only
AngularTS documentation. Then note which design questions happen to feel
familiar from HTMX.

## Verify

Test the normal link or form fallback, direct server endpoint, successful swap
or JSON assignment, failed response, keyboard path, and browser history. Do not
use an HTMX result as evidence that AngularTS behaves the same way.
