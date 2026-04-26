---
title: "Directive Overview"
weight: 290
description: "Learn how AngularTS directives attach behavior to HTML, how built-in directive groups are organized, and how to create custom directives."
---

Directives are how AngularTS attaches behavior and structure to HTML. A
directive is a marker on a DOM element, attribute, class, or comment that tells
`$compile` to attach behavior, transform DOM, wire events, create scopes, or
connect controllers.

Every built-in directive in AngularTS is applied as an HTML attribute using the
`ng-` prefix. The compiler normalizes prefixes, so `ng-bind`,
`data-ng-bind`, and `x-ng-bind` all match the same directive.

Exact custom directive contracts live in TypeDoc:

- [`Directive`](../../../typedoc/interfaces/Directive.html)
- [`DirectiveFactory`](../../../typedoc/types/DirectiveFactory.html)
- [`DirectiveFactoryFn`](../../../typedoc/types/DirectiveFactoryFn.html)
- [`Component`](../../../typedoc/interfaces/Component.html)
- [`CompileFn`](../../../typedoc/types/CompileFn.html)
- [`PublicLinkFn`](../../../typedoc/types/PublicLinkFn.html)
- [`TranscludeFn`](../../../typedoc/types/TranscludeFn.html)

## How Directives Are Matched

The `restrict` option controls where a directive can appear.

| Restrict | Match form | Example |
| --- | --- | --- |
| `A` | Attribute | `<span ng-bind="name"></span>` |
| `E` | Element | `<my-widget></my-widget>` |
| `C` | Class | `<div class="my-widget"></div>` |
| `EA` | Element or attribute | `<ng-form>` or `<div ng-form>` |

Attribute directives are the common case in AngularTS. They keep the host
element in place and augment it.

## Built-In Directive Groups

AngularTS groups its built-in directives by the user-facing job they perform.
Keep these groups in mind when choosing where to look in the docs.

| Group | Purpose | Examples |
| --- | --- | --- |
| [Data binding]({{< relref "/docs/directives/data-binding" >}}) | Synchronize scope data with the view | `ng-bind`, `ng-model`, `ng-class`, `ng-style` |
| [Structural]({{< relref "/docs/directives/structural" >}}) | Add, remove, repeat, or switch DOM | `ng-if`, `ng-repeat`, `ng-show`, `ng-hide`, `ng-switch` |
| [Forms]({{< relref "/docs/directives/forms" >}}) | Track validity, dirty state, messages, and model options | `form`, `ng-model`, `ng-messages`, validators |
| [HTTP]({{< relref "/docs/directives/http" >}}) | Trigger declarative network work from the DOM | `ng-get`, `ng-post`, `ng-put`, `ng-delete`, `ng-sse` |
| [Animations]({{< relref "/docs/directives/animations" >}}) | Coordinate directive-driven animation hooks | `ng-animate-swap`, `ng-animate-children` |
| [Advanced]({{< relref "/docs/directives/advanced" >}}) | Bridge browser APIs and integration boundaries | `ng-worker`, `ng-wasm`, `ng-viewport`, `ng-inject` |

## Create A Custom Directive

Register directives on a module with `.directive(name, factory)`. The factory
returns a directive definition object.

```javascript
angular.module("demo", []).directive("highlight", () => {
  return {
    restrict: "A",
    scope: {
      color: "@highlight",
    },
    link(scope, element) {
      const paint = (color) => {
        element.style.backgroundColor = color || "yellow";
      };

      paint(scope.color);

      scope.$watch("color", paint);
    },
  };
});
```

```html
<p highlight="gold">Pinned note</p>
```

Use `compile()` when the directive must transform template DOM before linking.
Use `link()` when it only needs to attach behavior to each compiled instance.

## Execution Order

When multiple directives appear on the same element, AngularTS sorts them by
priority from highest to lowest. Directives with equal priority run in
registration order.

```html
<li ng-repeat="item in items" ng-class="{ active: item.selected }">
  {{ item.name }}
</li>
```

Structural directives such as `ng-repeat` and `ng-if` use high priorities and
terminal behavior because they replace or remove DOM before lower-priority
directives are linked.

## Scope Choice

Use the default inherited scope for simple behavior. Create a child scope when
the directive needs local state. Use isolate scope bindings when the directive is
designed as a reusable widget with explicit inputs and callbacks.

```javascript
scope: {
  title: "@",
  value: "=",
  onSave: "&",
}
```

Prefer components for larger reusable UI pieces. Use directives for behaviors,
DOM integrations, structural transforms, and lightweight element coordination.

## Next Steps

- [Data binding]({{< relref "/docs/directives/data-binding" >}})
- [Structural directives]({{< relref "/docs/directives/structural" >}})
- [Form directives]({{< relref "/docs/directives/forms" >}})
- [HTTP directives]({{< relref "/docs/directives/http" >}})
