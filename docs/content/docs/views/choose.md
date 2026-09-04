---
title: 'Choose a view style'
weight: 40
description:
  'Decide between HTML templates and typed component views using team,
  type-safety, DOM, and maintenance requirements.'
---

## What you will decide

First decide who owns the model and rendering. The server should own both by
default. View style follows that decision.

## Before you start

Read the short [template]({{< relref "/docs/views/templates" >}}) and
[typed-view]({{< relref "/docs/views/typed" >}}) examples.

| Prefer HTML templates when                      | Prefer typed programmatic views when               |
| ----------------------------------------------- | -------------------------------------------------- |
| The server owns the model and rendering         | The browser owns the application model             |
| The page or route is server-rendered            | The browser owns model consistency and compilation |
| AngularTS adds a small enhancement              | A complex screen is primarily TypeScript           |
| Server-rendered markup is reused                | Checked model-to-view bindings are required        |
| Normal HTML remains the clearest representation | Native properties and browser APIs dominate        |

Both choices use `module.component()`, controller injection, reactive state,
transclusion, routing, and lifecycle cleanup. They can interoperate, but avoid
splitting one complex client-owned model across TypeScript and loosely typed
HTML bindings.

Start with server-rendered HTML, not a client template that recreates the same
page. Keep using HTML for server-owned pages, route fragments, and focused
enhancements. If the browser must take ownership of a complex model, a typed
programmatic view can add compile-time checks between the model and DOM. It is
optional; HTML templates remain supported. Make REST contracts, cache
consistency, and browser security policy primary at the same ownership threshold;
simple HTTP remains preferable before it.

Choose at the module boundary. A server-rendered login module can use HTML while
a dashboard module in the same application uses a client-owned model and its
preferred view style. Do not convert one merely to make it match the other.

## Next step

Read [Keep the application on the
server]({{< relref "/docs/guides/server-first" >}}), then follow the selected
authoring guide.
