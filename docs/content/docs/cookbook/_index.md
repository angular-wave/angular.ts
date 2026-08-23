---
title: Cookbook
description: Recipes for common AngularTS problems
weight: 90
---

Use the cookbook when you have a concrete problem and need a working pattern.
Start with debugging if AngularTS is new to you. Every progressive recipe ends
with a task to apply and checks that prove it worked.

## Find recipes by area

Start with [beginner recipes](find-beginner-recipes/), then choose
[forms](find-form-recipes/), [HTTP](find-http-recipes/),
[DOM updates](find-dom-recipes/), [security](find-security-recipes/),
[performance](find-performance-recipes/),
[data correctness](find-data-recipes/), [navigation](find-navigation-recipes/),
[operations](find-operations-recipes/), or
[advanced browser work](find-advanced-recipes/).

## Choose who owns the result

Start from the result your application needs, not from a directive name.

| Needed result                                           | Start with                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The server already knows the final HTML                 | [Swap server-rendered HTML]({{< relref "/docs/cookbook/swap-server-html" >}})                 |
| One interaction needs JSON and local template state     | [Build and submit forms]({{< relref "/docs/cookbook/forms" >}})                               |
| Several features share records and write operations     | [Read, write, and prefetch REST data]({{< relref "/docs/cookbook/rest" >}})                   |
| The browser must own URLs, history, and nested views    | [Add browser-owned routes]({{< relref "/docs/cookbook/routing" >}})                           |
| The server pushes one-way updates                       | [Receive live server events]({{< relref "/docs/cookbook/advanced-sse" >}})                    |
| The browser and server both send live messages          | [Exchange WebSocket messages]({{< relref "/docs/cookbook/advanced-websocket" >}})             |
| Existing computation blocks rendering after measurement | [Move measured CPU work to a worker]({{< relref "/docs/cookbook/advanced-worker" >}})         |
| The measured runtime contains unused features           | [Build a smaller production runtime]({{< relref "/docs/cookbook/optimized-runtime-build" >}}) |

Prefer the first applicable row. Do not introduce a client route or shared data
service when one server response and one declarative interaction solve the
problem.

## Start here

1. [Debug a running
   application]({{< relref "/docs/cookbook/inspect-running-application" >}})
2. [Select an element with
   ng-el]({{< relref "/docs/cookbook/select-elements" >}})
3. [Pass server data without another
   request]({{< relref "/docs/cookbook/server-data" >}})
4. [Update existing DOM from state]({{< relref "/docs/cookbook/update-dom" >}})
5. [Replace DOM from state]({{< relref "/docs/cookbook/replace-dom" >}})
6. [Swap server-rendered HTML]({{< relref "/docs/cookbook/swap-server-html" >}})
7. [Run effects outside the DOM]({{< relref "/docs/cookbook/effects" >}})
8. [Handle events]({{< relref "/docs/cookbook/event-handling" >}})
9. [Build and submit forms]({{< relref "/docs/cookbook/forms" >}})
10. [Read, write, and prefetch REST data]({{< relref "/docs/cookbook/rest" >}})
11. [Authenticate requests]({{< relref "/docs/cookbook/authentication" >}})
12. [Cache REST reads]({{< relref "/docs/cookbook/caching" >}})
13. [Add browser-owned routes]({{< relref "/docs/cookbook/routing" >}})

## Change server data

Data correctness: [handle uniqueness races](unique-race/),
[submit money safely](money-values/),
[send dates with zones](dates-time-zones/), and
[keep identifiers opaque](opaque-identifiers/).

HTTP behavior: [revalidate with ETag](conditional-cache/),
[serve maintenance responses](maintenance-mode/),
[validate return redirects](safe-redirect/),
[standardize errors](error-envelope/), and
[negotiate page or fragment](content-negotiation/).

Browser and content security: [sanitize rich text](rich-text/),
[deploy CSP](content-security-policy/),
[harden session cookies](session-cookie/),
[support password managers](password-form/), and
[redact secrets](secret-redaction/).

Interaction details: [focus the first error](focus-first-error/),
[design an empty state](empty-state/), and
[preserve focus after swaps](focus-after-swap/).

Transaction workflows: [respect rate limits](rate-limit/),
[run background jobs](background-job/),
[make critical writes idempotent](idempotent-write/),
[save multi-step forms](multi-step-form/), and
[apply bulk actions](bulk-action/).

Account and record workflows: [archive and restore](archive-restore/),
[handle permission rejection](permission-denied/),
[keep filters in the URL](url-filter/), and [log out safely](logout/).

Production form workflows: [show server validation](server-validation/),
[send CSRF proof](csrf-protected-form/), [confirm deletion](confirm-delete/),
and [resolve concurrent edits](edit-conflict/).

Production response workflows: [retry a failed read](retry-failed-read/),
[paginate on the server](server-pagination/),
[download with the browser](download-file/), and
[swap trusted server HTML](safe-html-fragment/).

Keep important forms usable with
[progressive enhancement](progressive-enhancement/), and define their
[HTTP response contracts](http-response-contracts/) before wiring the success
and failure branches.

| Problem                                    | Recipe                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Edit one record without leaving the page   | [Edit a server record in place]({{< relref "/docs/cookbook/inline-edit" >}})          |
| Delete one row without rebuilding its list | [Delete a row after server confirmation]({{< relref "/docs/cookbook/delete-row" >}})  |
| Search without stale responses winning     | [Search while the user types]({{< relref "/docs/cookbook/active-search" >}})          |
| Load choices from another field            | [Load one select from another]({{< relref "/docs/cookbook/dependent-selects" >}})     |
| Show a reversible change immediately       | [Update immediately and roll back]({{< relref "/docs/cookbook/optimistic-update" >}}) |
| Upload a file and allow cancellation       | [Cancel a file upload]({{< relref "/docs/cookbook/upload-cancel" >}})                 |
| Choose status, content type, and body      | [Design an HTTP response]({{< relref "/docs/cookbook/http-response-contracts" >}})    |

## Load and navigate faster

| Problem                                    | Recipe                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Data should be ready before click          | [Prefetch data before the user clicks]({{< relref "/docs/cookbook/rest#prefetch-data-before-the-user-clicks" >}}) |
| More rows should load near the viewport    | [Load the next page near the viewport]({{< relref "/docs/cookbook/infinite-scroll" >}})                           |
| Stable lookup lists repeat                 | [Cache reference data safely]({{< relref "/docs/cookbook/cached-reference-data" >}})                              |
| A private request finds an expired session | [Return users to login]({{< relref "/docs/cookbook/session-expiration" >}})                                       |
| A dialog needs current server content      | [Load a dialog from the server]({{< relref "/docs/cookbook/server-dialog" >}})                                    |

## Add specialized browser behavior

- [Make a server-driven interaction
  accessible]({{< relref "/docs/cookbook/accessible-requests" >}})
- [Load content near the
  viewport]({{< relref "/docs/cookbook/advanced-viewport" >}})
- [Receive live server events]({{< relref "/docs/cookbook/advanced-sse" >}})
- [Exchange live messages with
  WebSocket]({{< relref "/docs/cookbook/advanced-websocket" >}})
- [Move measured CPU work to a
  worker]({{< relref "/docs/cookbook/advanced-worker" >}})
- [Call an existing WebAssembly
  module]({{< relref "/docs/cookbook/advanced-wasm" >}})
- [Build a smaller production
  runtime]({{< relref "/docs/cookbook/optimized-runtime-build" >}})
- [Understand the similarity to
  HTMX]({{< relref "/docs/cookbook/htmx-patterns" >}})

## Integrate another framework

Start with [the integration decision guide](framework-integration/), then use
the [event bus](framework-event-bus/) for transient messages,
[`ng-observe`](framework-observe/) for reflected web-component attributes, or a
[shared application model](framework-model/) for current reactive state.

## Diagnose a production problem

Production change management: [deliver server flags](feature-flag/),
[record audit events](audit-trail/), and
[roll contracts out compatibly](compatible-rollout/).

When an API must use another origin, follow the
[cross-origin request recipe](cross-origin-request/) before adding browser
workarounds.

Make failures traceable with a [request ID](request-id/), then run the
[shipping check](ship-interaction/) against the complete interaction.

Trace one interaction with the [HTTP debugging recipe](debug-http-interaction/),
then [control repeated requests](control-repeat-requests/) only after measuring
them. Before shipping,
[audit the full server-driven interaction](secure-request/).

| Problem                                    | Recipe                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| A server page needs one interactive widget | [Add behavior without making an SPA]({{< relref "/docs/cookbook/style-guide" >}})   |
| A component changed state but DOM did not  | [Make a component view reactive]({{< relref "/docs/cookbook/reactive-state" >}})    |
| Refreshed rows lose focus                  | [Keep repeated rows stable]({{< relref "/docs/cookbook/collections" >}})            |
| Hidden UI keeps doing work                 | [Stop hidden UI work]({{< relref "/docs/cookbook/rendering" >}})                    |
| An older request wins                      | [Ignore stale request results]({{< relref "/docs/cookbook/network-and-routing" >}}) |
| A listener survives its UI                 | [Clean up browser resources]({{< relref "/docs/cookbook/lifecycle" >}})             |
| An interaction feels slow                  | [Find the slow part]({{< relref "/docs/cookbook/measure-before-optimizing" >}})     |
| Request states are incomplete              | [Render every request state]({{< relref "/docs/cookbook/best-practices" >}})        |
