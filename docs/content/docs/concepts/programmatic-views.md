---
title: 'Typed Component Views'
weight: 70
description:
  'Construct component and directive views with real DOM nodes, reactive
  readers, keyed collections, and normal AngularTS module registration.'
---

Programmatic views provide a JSX-free alternative to HTML templates. A view is
an ordinary function that returns real DOM nodes created with `tags`. It uses
the normal AngularTS compiler, scope lifecycle, dependency injection, component
registration, directive registration, and transclusion pipeline.

There is no separate mount API. Register the component or directive on an
AngularTS module and let the compiler instantiate it from normal markup.

## Create a component view

Import the helpers you use from the package entry point:

```ts
import {
  angular,
  attrs,
  each,
  event,
  props,
  tag,
  tagNS,
  tags,
} from '@angular-wave/angular.ts';
```

The same helpers are available together through `angular.view`.

```ts
const { attrs, each, event, props, tag, tagNS, tags } = angular.view;
```

Define the view directly on the component registration:

```ts
class CounterController {
  count = 0;
}

angular.module('app', []).component('counterButton', {
  controller: CounterController,
  view: ({ controller }) =>
    tags.button(
      { onclick: () => controller.count++ },
      () => `Count: ${controller.count}`,
    ),
});
```

The component is used like any template-backed component:

```html
<counter-button></counter-button>
```

## Return view children

A component or directive view can return any
[`ViewChild`](../../../typedoc/types/ViewChild.html). The former
[`ComponentViewChild`](../../../typedoc/types/ComponentViewChild.html) name is
retained as a compatibility alias.

- A DOM `Node`.
- A string, number, boolean, or bigint.
- A reactive child reader function.
- A nested array of view children.
- A `DocumentFragment`.
- `null`, `undefined`, or either boolean to render nothing.

Arrays are flattened recursively. Existing nodes are moved rather than cloned,
and document fragments contribute their current child nodes.

```ts
view: ({ controller }) => [
  tags.h2(() => controller.title),
  controller.showDetails ? tags.p(controller.initialDetails) : null,
];
```

The conditional expression in this example is evaluated only when the view is
constructed. Make the condition itself a reader when it must remain reactive:

```ts
view: ({ controller }) => [
  tags.h2(() => controller.title),
  () => (controller.showDetails ? tags.p(controller.details) : null),
];
```

## Use reactive readers

A function in a child or ordinary non-event property position is a reactive
reader. AngularTS executes it, tracks the proxied scope and controller state it
reads, and updates only the corresponding DOM binding when that state changes.

```ts
tags.output(() => controller.total);

tags.button({
  disabled: () => !controller.canSubmit,
});

tags.input({
  value: () => controller.query,
});
```

A value that is evaluated before the tag function is a static snapshot:

```ts
tags.output(controller.total);
tags.button({ disabled: !controller.canSubmit });
```

Use reader functions whenever a child or property must be reevaluated
reactively.

Unlike string templates, programmatic views keep bindings between the model and
the rendered DOM inside TypeScript's type system. Renaming a controller or model
property updates through normal refactoring tools, while misspelled members and
incompatible typed DOM property values fail at compile time rather than becoming
runtime template errors.

## Properties and attributes

The first plain object passed to a tag is its property map. Reactive readers use
DOM property semantics, including properties exposed only by custom elements.
For static values, AngularTS assigns a DOM property when it exists on the
element and otherwise uses an attribute.

Normal property maps are checked against the element's DOM type. Use `attrs()`
for arbitrary attribute names and `props()` for custom-element properties;
misspelled native properties are rejected by TypeScript.

```ts
tags.input({
  value: () => controller.name,
  disabled: () => controller.saving,
  'data-field': 'name',
});
```

Use `attrs()` to force attribute semantics. Functions inside `attrs()` remain
reactive readers.

```ts
tags.section({
  ...attrs({
    'aria-busy': () => controller.loading,
    'data-count': () => controller.items.length,
  }),
});
```

Boolean HTML attributes use presence semantics. Other attributes, including ARIA
attributes, are serialized normally. For example, an ARIA value of `false`
becomes the string `"false"` rather than removing the attribute.

Use `props()` to assign exact, literal DOM property values. Values inside
`props()` are not reactive readers. This distinction permits function-valued
properties on custom elements:

```ts
const grid = tag('data-grid', {
  ...props({
    rowFormatter: (row: { name: string }) => row.name.toUpperCase(),
  }),
  hidden: () => controller.rows.length === 0,
});
```

Do not place reactive readers inside `props()`:

```ts
// Reactive property
tags.input({ value: () => controller.name });

// Literal function assigned as the value property
tags.input(props({ value: () => controller.name }));
```

Potentially dangerous properties such as `innerHTML` and `srcdoc` still pass
through AngularTS contextual escaping. Use trusted SCE values only when the
content has been reviewed and is intentionally trusted.

## Handle events

Functions assigned to native `on*` properties are event handlers:

```ts
tags.button({
  onclick: (event) => controller.submit(event),
});
```

Use `event()` for listener options, object listeners, or custom event names. It
uses native `addEventListener` semantics and is removed with the view.

```ts
tags.button({
  click: event(() => controller.submit(), { once: true }),
});

tag('data-grid', {
  selectionchange: event<CustomEvent<Selection>>((event) =>
    controller.select(event.detail),
  ),
});
```

Errors thrown by programmatic event handlers and reactive bindings are routed
through `$exceptionHandler`.

## Render collections

Standard array methods are useful for static collections:

```ts
tags.ul(controller.todos.map((todo) => tags.li(todo.title)));
```

This calls `map()` once and creates a DOM snapshot. Changes to the array do not
insert, remove, or reorder list nodes.

Use `each()` for a reactive collection:

```ts
tags.ul(
  each(
    () => controller.todos,
    (todo) => todo.id,
    (todo) => tags.li(() => todo().title),
  ),
);
```

`each()` accepts three functions:

- The collection reader returns an iterable, `null`, or `undefined`.
- The key selector receives the concrete item and must return a unique, stable
  key.
- The renderer receives a reactive
  [`ViewReader`](../../../typedoc/types/ViewReader.html) rather than an item
  snapshot.

Calling `todo()` reads the current value associated with that key. When a new
object replaces an old object with the same key, AngularTS preserves its DOM
nodes and updates bindings that read `todo()`. Reordering moves existing nodes,
new keys create nodes, and removed keys dispose their nodes and bindings.

Duplicate keys are rejected through `$exceptionHandler`. Keep keys stable and
unique for the lifetime of each logical item.

## Create dynamic and namespaced elements

Use `tag()` when the HTML tag name is dynamic or cannot use property access:

```ts
const widget = tag('account-summary', { accountId: controller.accountId });
```

Use `tagNS()` or call `tags` with a namespace URI for SVG, MathML, or another
XML namespace:

```ts
const svg = tags('http://www.w3.org/2000/svg');

const icon = svg.svg(
  { viewBox: '0 0 24 24' },
  svg.circle({ cx: 12, cy: 12, r: 10 }),
);

const otherCircle = tagNS('http://www.w3.org/2000/svg', 'circle', {
  cx: 12,
  cy: 12,
  r: 10,
});
```

## Access the view context

Component views receive a
[`ComponentViewContext`](../../../typedoc/interfaces/ComponentViewContext.html)
with these members:

| Member       | Purpose                                                           |
| ------------ | ----------------------------------------------------------------- |
| `controller` | The initialized component controller.                             |
| `scope`      | The scope that owns reactive bindings and generated DOM.          |
| `host`       | The component host element.                                       |
| `element`    | Deprecated alias for `host`.                                      |
| `transclude` | The transclusion function when transclusion is enabled.           |
| `onDestroy`  | Registers view-owned cleanup and returns a cancellation function. |

Directive views receive a
[`DirectiveViewContext`](../../../typedoc/interfaces/DirectiveViewContext.html).
It adds `required`, containing controllers resolved from the directive's
`require` declaration. Its `controller` is `undefined` when none is declared.

## Create a directive view

Directives can provide `view` instead of a template. Generated nodes continue
through the normal compile and link pipeline, so registered directives on those
nodes remain available.

```ts
app.directive('liveClock', () => ({
  view: ({ scope, onDestroy }) => {
    scope.now = new Date();
    const timer = setInterval(() => (scope.now = new Date()), 1000);
    onDestroy(() => clearInterval(timer));
    return tags.time(() => scope.now.toLocaleTimeString());
  },
}));
```

Use it through normal compiled markup:

```html
<div live-clock></div>
```

## Own external resources

Reactive bindings, event listeners, keyed children, and compiled fragments are
disposed automatically. Register resources created by application code with
`onDestroy()`:

```ts
view: ({ onDestroy }) => {
  const socket = new WebSocket('/events');
  onDestroy(() => socket.close());
  return tags.div('Connected');
};
```

Cleanup runs when either the owning scope is destroyed or the host element is
deallocated. The returned cancellation function transfers ownership elsewhere. A
cleanup registered after destruction runs immediately. Cleanup errors are
reported through `$exceptionHandler`.

## Language integrations

The Kotlin, Scala, and Dart integrations expose typed wrappers for the same
runtime model:

- `ProgrammaticTags` wraps `angular.tags`.
- `ProgrammaticViewApi` wraps `angular.view` helpers.
- `ProgrammaticViewContext` exposes `controller`, `required`, `scope`,
  `element`, `transclude`, and `onDestroy`.
- Integration `each()` renderers receive an item reader, matching TypeScript.

Plain callback functions are reactive in normal child and property positions.
Use each integration's `props()` helper when assigning a literal callback as a
DOM property.

## Choose templates or programmatic views

Use a programmatic view when direct DOM construction, dynamic tag selection,
custom-element property assignment, or fine-grained imperative integration is
clearer than markup. Use an HTML template when static document structure and
designer-readable markup are more important.

Both forms use the same AngularTS module, scope, compiler, directive, and
lifecycle infrastructure and can coexist in one application.
