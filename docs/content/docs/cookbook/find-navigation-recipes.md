---
title: Find a navigation recipe
description: Keep URLs, server pages, router states, sessions, and redirects coherent
weight: 87
---

## Start with server navigation

| Problem | Recipe |
| ------- | ------ |
| Keep forms useful before enhancement | [Use progressive enhancement]({{< relref "/docs/cookbook/progressive-enhancement" >}}) |
| Preserve search in the address | [Keep filters in the URL]({{< relref "/docs/cookbook/url-filter" >}}) |
| Preserve list navigation | [Paginate on the server]({{< relref "/docs/cookbook/server-pagination" >}}) |
| Return safely after sign-in | [Validate redirects]({{< relref "/docs/cookbook/safe-redirect" >}}) |

## Add browser-owned state where needed

| Problem | Recipe |
| ------- | ------ |
| Define application routes | [Use the router]({{< relref "/docs/cookbook/routing" >}}) |
| Enter a state after sign-in | [Handle authentication]({{< relref "/docs/cookbook/authentication" >}}) |
| Enter the next saved form step | [Build a multi-step form]({{< relref "/docs/cookbook/multi-step-form" >}}) |
| Recover from an expired session | [Handle session expiration]({{< relref "/docs/cookbook/session-expiration" >}}) |
| Enter a public state after logout | [Log out safely]({{< relref "/docs/cookbook/logout" >}}) |
