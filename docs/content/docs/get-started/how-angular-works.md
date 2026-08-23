---
title: 'How AngularTS works'
linkTitle: 'How it works'
weight: 40
description:
  'Understand how the module, injector, compiler, scope, directives, and DOM
  cooperate when an AngularTS application starts.'
---

## What you will learn

You will trace the first application from page load to a reactive DOM update.

## Before you start

Complete the [first
application]({{< relref "/docs/get-started/first-application" >}}).

## Startup in six steps

1. The browser parses the HTML and creates the DOM.
2. The AngularTS script finds the element marked with `ng-app`.
3. AngularTS loads that element's named module and creates an injector.
4. The compiler walks the element's DOM and finds directives.
5. The controller creates state on its scope.
6. Directives connect that state to text, properties, events, and child DOM.

An injector creates and shares dependencies. A directive adds behavior to HTML.
A scope owns reactive state and lifecycle cleanup. The compiler is the runtime
process that connects directives to DOM nodes; it is not a build step.

## A reactive update

When `addTodo()` pushes an item into `todos`, the reactive scope records that
change. AngularTS schedules the affected bindings, updates the repeated list and
remaining count, and leaves unrelated DOM alone.

You do not manually redraw the page, compare a virtual DOM, or start a digest
loop. Browser events and native asynchronous callbacks can update reactive state
directly.

## Application structure

Small applications may stay in one file. Larger applications normally use a
module, components for UI regions, services for shared behavior or data, and a
router for multiple screens. Dependency injection connects those parts without
global variables.

## Next step

Choose a [learning path]({{< relref "/docs/get-started/learning-paths" >}}).
