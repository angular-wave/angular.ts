---
title: Documentation
linkTitle: Docs
menu: { main: { weight: 20 } }
---

AngularTS is a browser framework for building interactive web pages and
applications with HTML, JavaScript, and TypeScript. These docs assume no prior
framework knowledge.

## Start here

1. [Introduction]({{< relref "/docs/get-started/introduction" >}}) explains the
   framework's HTML-first model and what it adds to AngularJS.
2. [Install AngularTS]({{< relref "/docs/get-started/installation" >}}) adds the
   framework with one script tag or an npm package.
3. [Build your first
   application]({{< relref "/docs/get-started/first-application" >}}) creates a
   task list one small step at a time.
4. [Keep the application on the
   server]({{< relref "/docs/guides/server-first" >}}) explains when to enhance
   HTML and when a module should own a browser model.
5. [Choose a view style]({{< relref "/docs/views/choose" >}}) compares HTML
   templates with typed programmatic views.

If you already know the basics, use the [task
guides]({{< relref "/docs/guides" >}}) to add a feature or the
[reference]({{< relref "/docs/reference" >}}) to look up an API.

Use the [cookbook]({{< relref "/docs/cookbook" >}}) when you have a concrete
problem and need a tested implementation pattern.

## What AngularTS provides

- Reactive state that updates only the affected DOM bindings.
- HTML templates and type-safe views in the same component model.
- Modules, dependency injection, directives, forms, HTTP, routing, and
  animations in one runtime package.
- Buildless script-tag use and typed npm use.
- Language integrations for JVM, JavaScript-targeting, and native ecosystems.

New terms are defined in the
[glossary]({{< relref "/docs/concepts/glossary" >}}).

---

### What is AngularTS?

AngularTS is buildless, type-safe and reactive JS framework for building
structured web applications at any scale. It continues the legacy of
[AngularJS](https://angularjs.org/) by providing the best developer experience
via immediate productivity without the burden of JS ecosystem tooling. Getting
started with AngularTS does not even require JavaScript. All you need is a
little bit of HTML. Below is a canonical example of a counter:

#### Example

{{< showhtml src="examples/counter/counter.html" >}}

#### Result

{{< showraw src="examples/counter/counter.html" >}}

---

This code demonstrates the following key AngularTS features:

- **HTML-first:** AngularTS is designed for HTML-first approach, meaning your
  application logic can be expressed declaratively in your markup using custom
  attributes--called _directives_. Here, we are using `ng-init` directive to
  initialize our application state and `ng-click` directive to add an event
  handler that changes our state.

- **Template-driven:** AngularTS’s built-in template engine automatically keeps
  the UI in sync with your application state, eliminating the need for manual
  DOM tracking and updates. The `{{count}}` expression above is an example of
  Angular's interpolation syntax. As the value of `count` variable increases,
  our UI is updated with the new state.

- **Island-first and zero-cost:** AngularTS creates an application on any HTML
  tag with `ng-app` attribute, allowing multiple independent applications
  (modules) to live on a single page. This allows AngularTS to work alongside
  your existing tech stack where the majority of your page is rendered on the
  server, while AngularTS is isolated to small “islands” (regions of your page)
  where custom interactivity or personalization is required.

- **Micro-framework appearance:** With its minimal setup, AngularTS is
  well-suited for quick experiments, LLM-generated code, and learning web
  development in general. But beneath its lightweight surface, it supports
  structured enterprise design patterns, MVC architecture, and component-driven
  design. With its rich directive library, state-based routing and support for
  animations, AngularTS is a complete package for building large SPAs, server,
  mobile, and desktop applications.
