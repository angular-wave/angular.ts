---
title: Add routing
weight: 40
description:
  Register AngularTS route trees, choose resolve boundaries, and make navigation
  cleanup and failure behavior explicit.
---

## Do not default to client-side routing

Use server routes and ordinary links first. They provide addressability,
history, streaming HTML, metadata, authorization boundaries, and resilient
navigation without a client router.

Introduce the AngularTS router when multiple screens are intentionally owned by
one bootstrapped application and preserving client state or resources between
those screens materially improves the product. A client router is not required
for AngularTS components embedded in server-rendered pages.

Keep route snippets server-rendered for as long as possible. Let the router own
the transition, URL state, and component lifetime while the server still renders
the route HTML from its authoritative model. Do not move the model and rendering
into the browser merely because navigation no longer reloads the document.

If a route eventually needs a complex browser-owned model, move compilation with
that model and make a typed programmatic view the primary renderer for the
client-owned screen.

That transition also makes REST services, frontend cache consistency, and
browser-facing security policy primary concerns. A router using server-rendered
fragments can continue using simple HTTP; client navigation alone does not
justify building a separate API and cache layer.

Scope the router to the module that needs it. A dashboard can be a full SPA
under its own `ng-app` while sign-in, recovery, public pages, and downloads
remain server-rendered routes. Adding a dashboard router does not make the
entire application a client-owned router tree.

## Register components as screens

The router is part of the built-in runtime; do not add a speculative `ng.router`
module dependency.

```js
const app = angular.createModule('taskBoard', []);

app
  .router({
    name: 'tasks',
    url: '/tasks',
    component: 'taskList',
  })
  .router({
    name: 'tasks.detail',
    url: '/{taskId:int}',
    component: 'taskDetail',
  });
```

```html
<nav aria-label="Tasks">
  <a ng-state="'tasks'">All tasks</a>
</nav>
<main ng-view></main>
```

Use stable state names as application identifiers. URLs may evolve; state names
are referenced by links, transitions, tests, and diagnostics.

Resolve identity or authorization data that must exist before the screen can be
valid. Load optional panels and large collections inside the component so the
route can render a shell. Parent states own shared layout and resolves; children
should not refetch parent-owned data.

Test direct URL entry, back/forward, invalid parameters, same-state parameter
changes, rejected resolves, and leaving during pending work. Continue with the
[routing overview](/docs/routing/overview/).
