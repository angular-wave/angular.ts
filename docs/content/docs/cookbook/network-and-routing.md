---
title: Ignore stale request results
description: Keep older responses from replacing newer search results
weight: 105
---

## Problem

A user searches for `cat`, then quickly searches for `caterpillar`. The second
request finishes first. The slower `cat` response arrives later and replaces the
correct results.

## Recipe

Give each request a sequence number. Apply a response only when it belongs to
the newest request.

```js
app.controller('SearchController', function SearchController($http) {
  let latestRequest = 0;

  this.results = [];
  this.loading = false;
  this.error = '';

  this.search = async (query) => {
    const request = ++latestRequest;
    this.loading = true;
    this.error = '';

    try {
      const response = await $http.get('/api/search', {
        params: { q: query },
      });

      if (request === latestRequest) {
        this.results = response.data;
      }
    } catch (error) {
      if (request === latestRequest) {
        this.error = 'Search failed';
      }
    } finally {
      if (request === latestRequest) {
        this.loading = false;
      }
    }
  };
});
```

## Why this works

Network responses can arrive in any order. The sequence number records which
request currently owns the screen. Older requests may finish, but they cannot
change results, errors, or loading state.

This check is still needed when the transport supports cancellation. A request
can finish just before cancellation reaches it.

## Verify

1. Delay short-query responses in the browser network tools.
2. Search for a short term, then immediately search for a longer term.
3. Confirm only the longer term changes the screen.
4. Repeat with a failed older request and confirm it does not replace the latest
   state.

## Avoid

Do not use one shared `loading` boolean without checking which request finished.
An older request can otherwise hide the loading indicator for a newer one.
