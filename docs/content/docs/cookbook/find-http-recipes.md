---
title: Find an HTTP recipe
description: Choose statuses, bodies, caching, retries, fragments, and origin policy
weight: 82
---

## Define the response first

| Problem | Recipe |
| ------- | ------ |
| Choose status, body, and content type | [Design an HTTP response]({{< relref "/docs/cookbook/http-response-contracts" >}}) |
| Keep error bodies predictable | [Use an error envelope]({{< relref "/docs/cookbook/error-envelope" >}}) |
| Return a page or a fragment | [Negotiate content explicitly]({{< relref "/docs/cookbook/content-negotiation" >}}) |
| Swap trusted server markup | [Replace a region with server HTML]({{< relref "/docs/cookbook/safe-html-fragment" >}}) |

## Control requests

| Problem | Recipe |
| ------- | ------ |
| Recover from a failed read | [Offer manual retry]({{< relref "/docs/cookbook/retry-failed-read" >}}) |
| Stop duplicate or stale requests | [Control repeated requests]({{< relref "/docs/cookbook/control-repeat-requests" >}}) |
| Respect a server limit | [Handle rate limiting]({{< relref "/docs/cookbook/rate-limit" >}}) |
| Move slow work out of the request | [Run a background job]({{< relref "/docs/cookbook/background-job" >}}) |
| Avoid retransferring unchanged data | [Revalidate with ETag]({{< relref "/docs/cookbook/conditional-cache" >}}) |
| Stream a generated file to disk | [Use a browser download]({{< relref "/docs/cookbook/download-file" >}}) |

## Handle deployment boundaries

| Problem | Recipe |
| ------- | ------ |
| Call JSON services | [Use REST services]({{< relref "/docs/cookbook/rest" >}}) |
| Serve a temporary outage | [Return maintenance mode]({{< relref "/docs/cookbook/maintenance-mode" >}}) |
| Call another origin | [Configure cross-origin access]({{< relref "/docs/cookbook/cross-origin-request" >}}) |
