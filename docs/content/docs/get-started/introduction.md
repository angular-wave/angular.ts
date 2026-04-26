---
title: "AngularTS: modern evolution of AngularJS"
weight: 10
description: "AngularTS preserves AngularJS's HTML-first model and dependency injection while adding reactive change detection, TypeScript support, and native browser APIs."
---
AngularTS is a modernized continuation of [AngularJS](https://angularjs.org/) — carrying forward its three core pillars (string interpolation, dependency injection, and two-way data binding) while rebuilding the internals around a reactive change-detection model, full TypeScript support, and direct access to native browser APIs. It requires no build step and no bundler to get started.
## What AngularTS preserves from AngularJS

AngularJS was the result of a decade of engineering by the Angular team at Google and accumulated one of the largest test suites in open-source JavaScript. AngularTS inherits that foundation directly:

* **Declarative HTML templates** using familiar `ng-*` directives
* **Dependency injection** container for organizing and composing application services
* **Two-way data binding** between the DOM and application state
* **Controllers, filters, and the module system** — all structurally compatible with AngularJS patterns

If you have existing AngularJS knowledge, the mental model transfers directly.
## What AngularTS adds

AngularTS extends the AngularJS foundation with modern primitives and new capabilities:

#### Reactive change detection

Proxy-based reactivity replaces the digest cycle. The DOM updates only when data actually changes — no polling, no virtual DOM diffing.

#### Native DOM and Promises

Directives and controllers work directly with native DOM APIs. The `$q` and `$timeout` abstractions are replaced by native `Promise` and `setTimeout`.

#### Built-in enterprise router

`ng-router` is a port of `ui-router`, supporting nested views, state transitions, resolves, and URL matching out of the box.

#### HTMX-inspired HTTP directives

`ng-get`, `ng-post`, `ng-put`, and `ng-delete` let you make HTTP requests declaratively from HTML attributes.

#### Real-time injectables

`$websocket`, `$sse` (Server-Sent Events), `$rest`, Web Workers, and WebAssembly modules are first-class injectable services.

#### Built-in animations

CSS and JavaScript animation support ships in the core package with no additional dependencies.
## When to use AngularTS

AngularTS is a strong fit for these scenarios:

**Server-rendered applications with interactive islands.** Any HTML element can host an independent `ng-app`. You can drop AngularTS into a server-rendered page and add interactivity to specific regions without restructuring the whole application.

**Applications where a build step is a liability.** AngularTS loads from a CDN script tag and runs directly in the browser. There are no compilation steps, no bundler configuration files, and no Node.js required to develop or deploy.

**Large-scale SPAs that need structure.** The module system, dependency injection, state-based router, and MVC architecture scale to enterprise applications. AngularTS is not just a micro-library — it is a complete framework for applications of any size.

**Migrating from AngularJS.** If you maintain an AngularJS codebase and want to modernize incrementally, AngularTS preserves the API surface you already know.
## How it compares to other frameworks

|                      | AngularTS   | React    | Vue      | Angular (v2+) |
| -------------------- | ----------- | -------- | -------- | ------------- |
| Build step required  | No          | Yes      | Optional | Yes           |
| CDN drop-in          | Yes         | Partial  | Yes      | No            |
| Two-way binding      | Yes         | No       | Yes      | Yes           |
| Dependency injection | Yes         | No       | No       | Yes           |
| HTML-first templates | Yes         | No (JSX) | Yes      | Yes           |
| Bundle size          | Small (UMD) | Medium   | Small    | Large         |

> **Note:** Angular 2+ (also called just "Angular") is a complete rewrite of AngularJS and shares no API surface with it. AngularTS is a continuation of AngularJS — not a migration target from Angular 2+.
## Philosophy

AngularTS stays as close to web standards as possible. It avoids inventing abstractions where the platform already provides them: native `Promise` instead of `$q`, native `fetch` under the hood for `$http`, direct DOM element references in directives instead of jQuery wrappers. This keeps the mental model small and the debugging experience familiar.

The result is described by the project as "a high-performance, buildless, multi-paradigm and battle-tested JS framework."
## Next steps

#### [Installation]({{< relref "/docs/get-started/installation" >}})

Add AngularTS to your project via CDN or npm.

#### [Quickstart]({{< relref "/docs/get-started/quickstart" >}})

Build a working counter and todo list in minutes.
