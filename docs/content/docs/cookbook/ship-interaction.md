---
title: Check a server interaction before shipping
description: Walk one feature through behavior, failure, access, and operations
weight: 48
---

## Problem

An interaction works in the happy path but its production behavior has not been
checked as one complete system.

## Before you start

Choose one real user action and use its production-like endpoint and permissions.
Open the Elements, Console, and Network panels.

## Walk the whole path

Check these in order:

| Step | Question |
| ---- | -------- |
| Page | Does the useful server-rendered page work before enhancement? |
| Input | Are labels, names, constraints, and server validation aligned? |
| Request | Is the method correct and sent only once? |
| Access | Does the server check authentication, authorization, and CSRF? |
| Response | Are status, content type, and body appropriate? |
| State | Does success update only the intended scope and DOM? |
| Failure | Can the user understand, retry, cancel, or recover safely? |
| Concurrency | Can stale or duplicate requests corrupt state? |
| Accessibility | Are status and focus understandable without a pointer? |
| Operations | Can a request ID connect the visible failure to server logs? |

## Failure path

Treat any unanswered row as unfinished implementation rather than documentation
debt. Fix the smallest owning layer: browser markup, AngularTS wiring, endpoint,
storage transaction, or operational logging.

## Apply it now

Run the table against the newest state-changing interaction. Record evidence for
each answer: a browser trace, server test, accessibility check, or log lookup.

## Verify

Repeat with invalid input, no permission, slow networking, duplicate activation,
stale data, and a controlled server failure. Ship when every outcome is deliberate.
