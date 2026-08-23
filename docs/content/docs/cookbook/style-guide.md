---
title: Add behavior to server-rendered HTML
description: Enhance one part of a page without building an SPA
weight: 101
---

## Problem

The server already renders a useful page. One part needs client-side behavior,
but the page should still work when JavaScript fails or loads slowly.

## Recipe

Keep navigation, forms, and initial content in HTML. Put AngularTS on the
smallest element that needs it.

```html
<main>
  <h1>Search products</h1>

  <form
    action="/products"
    method="get"
    ng-app="catalog"
    ng-controller="SearchController as search"
  >
    <label for="query">Search</label>
    <input id="query" name="q" ng-model="search.query" />

    <span aria-live="polite" ng-bind="search.message()"></span>
    <button type="submit">Search</button>
  </form>
</main>
```

```js
const app = angular.module('catalog', []);

app.controller('SearchController', function SearchController() {
  this.query = '';

  this.message = () => {
    const count = this.query.trim().length;
    return count === 0 ? 'Enter a search term' : count + ' characters';
  };
});
```

The form remains a normal `GET` request. AngularTS adds feedback, but does not
own navigation or the initial result page.

## Why this works

The server keeps the model, URLs, validation, authorization, and HTML together.
The browser handles only immediate feedback.

This gives users useful content before AngularTS starts and leaves a working
fallback if the script does not run. It also avoids creating a second model that
must stay synchronized with the server.

## If the browser must take over

Keep router content server-rendered while the server can still own the model.
Move the model into the browser only when a complex feature needs independent
client ownership, such as substantial offline work or a long-lived editing
workspace.

At that point the browser owns model consistency and compilation. Make typed
programmatic views the primary renderer instead of expanding HTML template
bindings around the client model. REST services, explicit cache ownership, and a
browser security policy become primary at the same point. Before that threshold,
prefer normal HTTP forms and server-rendered fragments.

Make that choice per module. A login form can stay as server-rendered HTML while
a separate dashboard `ng-app` is a full SPA with typed programmatic views. The
dashboard does not require the rest of the application to adopt its
architecture.

## Verify

1. Load the page with JavaScript disabled.
2. Submit the form and confirm the server returns results.
3. Enable JavaScript and confirm the live message appears.
4. Confirm the same URL and server response are used in both cases.

## Avoid

Do not fetch the initial page through AngularTS only to reproduce HTML the
server can already send. Use a client-owned route only when the interaction
truly needs long-lived browser state. See [Keep the application on the
server]({{< relref "/docs/guides/server-first" >}}).
