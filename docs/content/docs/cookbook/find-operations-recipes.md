---
title: Find an operations recipe
description: Trace failures, survive outages, control rollout, and explain sensitive changes
weight: 88
---

## Diagnose a request

| Problem | Recipe |
| ------- | ------ |
| Follow element, scope, request, and DOM | [Debug an HTTP interaction]({{< relref "/docs/cookbook/debug-http-interaction" >}}) |
| Connect an error to server logs | [Show a request ID]({{< relref "/docs/cookbook/request-id" >}}) |
| Keep credentials out of telemetry | [Redact secrets]({{< relref "/docs/cookbook/secret-redaction" >}}) |
| Check a whole feature | [Run the shipping check]({{< relref "/docs/cookbook/ship-interaction" >}}) |

## Operate degraded systems

| Problem | Recipe |
| ------- | ------ |
| Tell users when to retry | [Handle rate limits]({{< relref "/docs/cookbook/rate-limit" >}}) |
| Move long work to a worker process | [Run a background job]({{< relref "/docs/cookbook/background-job" >}}) |
| Serve a planned outage | [Return maintenance mode]({{< relref "/docs/cookbook/maintenance-mode" >}}) |

## Change production safely

| Problem | Recipe |
| ------- | ------ |
| Deliver a rollout decision | [Use server feature flags]({{< relref "/docs/cookbook/feature-flag" >}}) |
| Explain a sensitive state change | [Record an audit trail]({{< relref "/docs/cookbook/audit-trail" >}}) |
| Support mixed release versions | [Roll contracts out compatibly]({{< relref "/docs/cookbook/compatible-rollout" >}}) |
