---
title: 'Glossary'
weight: 250
description:
  'Plain-language definitions of browser and AngularTS terms used throughout the
  documentation.'
---

**Application**: The DOM region started by `ng-app` or `angular.bootstrap()`.

**Attribute**: A setting written inside an HTML opening tag.

**Binding**: A connection that transfers a value between state and the DOM.

**Bootstrap**: Start an application on a specific DOM element.

**Compiler**: The AngularTS runtime that discovers directives and connects them
to DOM nodes. It does not produce a build artifact.

**Component**: A registered, reusable UI unit with inputs, behavior, and a view.

**Controller**: An object or function that supplies state and behavior to a DOM
region or component.

**Dependency injection**: Requesting a registered value by token instead of
constructing or finding it directly.

**Directive**: An HTML attribute or element that adds AngularTS behavior.

**DOM**: The browser's live object tree for an HTML document.

**Expression**: A small JavaScript-like statement evaluated against a scope in
an HTML template.

**Module**: A named registry for an application's components, directives,
services, configuration, and dependencies.

**Reactive**: Able to notify dependent bindings when a value changes.

**Scope**: The reactive state and lifecycle context available to a compiled DOM
region.

**Service**: Shared behavior or data created and supplied by the injector.

**Template**: HTML containing AngularTS directives and expressions.

**Token**: The name or value used to request a dependency.

**Typed view**: A TypeScript function that constructs component DOM with typed
tags, properties, controller access, and reactive readers.

**View**: The DOM output rendered by a component, directive, or router state.
