---
title: Search while the user types
description: Debounce requests and ignore responses for an older query
weight: 24
---

## Problem

Search should feel immediate without sending a request for every keystroke or
letting an older response replace newer results.

## Before you start

The search endpoint must accept a bounded query and echo its normalized query in
the JSON response. Decide the minimum useful query length and result limit.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<section ng-init="query = ''; results = []">
  <input
    type="search"
    name="query"
    ng-model="query"
    ng-get="/api/search?q={{ query }}"
    data-trigger="input"
    data-delay="250"
    on-success="$res.query === query && (results = $res.items)"
  />

  <p ng-if="query && !results.length">No results for {{ query }}.</p>
  <ul>
    <li ng-repeat="result in results">{{ result.name }}</li>
  </ul>
</section>
```

## Server contract

Echo the normalized query with the results: `{"query":"boots","items":[...] }`.
The equality check prevents a slow response for an earlier query from winning.

## What AngularTS wires

`data-delay` waits for a pause. URL interpolation reads the current model, and
`on-success` applies only the response that still matches it.

## Failure path

Render request errors separately from an empty result. Add a minimum query
length when broad searches are expensive, and enforce limits on the server.

## Apply it now

Pick the search box with the highest request count. Record requests per query
and time to useful results before and after adding the delay and stale-response
check.

## Verify

Type two queries quickly and delay the first response in DevTools. Confirm the
URL contains the latest query and the late response never replaces newer
results.
