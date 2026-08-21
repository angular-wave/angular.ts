---
title: 'Programmatic Views'
weight: 70
description:
  'Construct component and directive views with real DOM nodes, reactive readers,
  keyed collections, and normal AngularTS module registration.'
---

Programmatic views provide a JSX-free alternative to HTML templates. A view is
an ordinary function that returns real DOM nodes created with `tags`. It uses
the normal AngularTS compiler, scope lifecycle, dependency injection, component
registration, directive registration, and transclusion pipeline.

There is no separate mount API. Register the component or directive on an
AngularTS module and let the compiler instantiate it from normal markup.

## Create a component view

Import the tag factories and helpers from the package entry point:

```typescript
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

The same helpers are available from a runtime instance through `angular.tags`
and `angular.view`.

```typescript
const {tags} = angular;
const {attrs, each, event, props, tag, tagNS} = angular.view;
```

Define the view directly on the component registration:

```typescript
class TodoListController {
  draft = '';
  todos = [
    {id: 1, title: 'Read the programmatic-view guide'},
  ];

  get canAdd() {
    return this.draft.trim().length > 0;
  }

  add() {
    if (!this.canAdd) return;

    this.todos.push({id: Date.now(), title: this.draft});
    this.draft = '';
  }

  remove(id: number) {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index >= 0) this.todos.splice(index, 1);
  }
}

const app = angular.module('todoApp', []);

app.component('todoList', {
  controller: TodoListController,
  view: ({controller}) =>
    tags.section(
      tags.h1('Todos'),
      tags.input({
        value: () => controller.draft,
        oninput: (event) => {
          controller.draft = (event.currentTarget as HTMLInputElement).value;
        },
      }),
      tags.button(
        {
          disabled: () => !controller.canAdd,
          onclick: () => controller.add(),
        },
        'Add',
      ),
      tags.ul(
        each(
          () => controller.todos,
          (todo) => todo.id,
          (todo) =>
            tags.li(
              () => todo().title,
              tags.button(
                {onclick: () => controller.remove(todo().id)},
                'Remove',
              ),
            ),
        ),
      ),
    ),
});
```

The component is used like any template-backed component:

```html
<todo-list></todo-list>
```

## Return view children

A component or directive view can return any `ComponentViewChild`:

- A DOM `Node`.
- A string, number, boolean, or bigint.
- A reactive child reader function.
- A nested array of view children.
- A `DocumentFragment`.
- `null`, `undefined`, or `false` to render nothing.

Arrays are flattened recursively. Existing nodes are moved rather than cloned,
and document fragments contribute their current child nodes.

```typescript
view: ({controller}) => [
  tags.h2(() => controller.title),
  controller.showDetails
    ? tags.p(controller.initialDetails)
    : null,
]
```

The conditional expression in this example is evaluated only when the view is
constructed. Make the condition itself a reader when it must remain reactive:

```typescript
view: ({controller}) => [
  tags.h2(() => controller.title),
  () => controller.showDetails
    ? tags.p(controller.details)
    : null,
]
```

## Use reactive readers

A function in a child or ordinary non-event property position is a reactive
reader. AngularTS executes it, tracks the proxied scope and controller state it
reads, and updates only the corresponding DOM binding when that state changes.

```typescript
tags.output(() => controller.total)

tags.button({
  disabled: () => !controller.canSubmit,
})

tags.input({
  value: () => controller.query,
})
```

A value that is evaluated before the tag function is a static snapshot:

```typescript
tags.output(controller.total)
tags.button({disabled: !controller.canSubmit})
```

Use reader functions whenever a child or property must be reevaluated
reactively.

## Properties and attributes

The first plain object passed to a tag is its property map. Reactive readers use
DOM property semantics, including properties exposed only by custom elements.
For static values, AngularTS assigns a DOM property when it exists on the
element and otherwise uses an attribute.

```typescript
tags.input({
  value: () => controller.name,
  disabled: () => controller.saving,
  'data-field': 'name',
})
```

Use `attrs()` to force attribute semantics. Functions inside `attrs()` remain
reactive readers.

```typescript
tags.section({
  ...attrs({
    'aria-busy': () => controller.loading,
    'data-count': () => controller.items.length,
  }),
})
```

Boolean HTML attributes use presence semantics. Other attributes, including
ARIA attributes, are serialized normally. For example, an ARIA value of
`false` becomes the string `"false"` rather than removing the attribute.

Use `props()` to assign exact, literal DOM property values. Values inside
`props()` are not reactive readers. This distinction permits function-valued
properties on custom elements:

```typescript
const grid = tag('data-grid', {
  ...props({
    rowFormatter: (row: {name: string}) => row.name.toUpperCase(),
  }),
  hidden: () => controller.rows.length === 0,
});
```

Do not place reactive readers inside `props()`:

```typescript
// Reactive property
tags.input({value: () => controller.name})

// Literal function assigned as the value property
tags.input(props({value: () => controller.name}))
```

Potentially dangerous properties such as `innerHTML` and `srcdoc` still pass
through AngularTS contextual escaping. Use trusted SCE values only when the
content has been reviewed and is intentionally trusted.

## Handle events

Functions assigned to native `on*` properties are event handlers:

```typescript
tags.button({
  onclick: (event) => controller.submit(event),
})
```

Use `event()` for listener options, object listeners, or custom event names. It
uses native `addEventListener` semantics and is removed with the view.

```typescript
tags.button({
  click: event(() => controller.submit(), {once: true}),
})

tag('data-grid', {
  selectionchange: event((event) => controller.select(event)),
})
```

Errors thrown by programmatic event handlers and reactive bindings are routed
through `$exceptionHandler`.

## Render collections

Standard array methods are useful for static collections:

```typescript
tags.ul(
  controller.todos.map((todo) => tags.li(todo.title)),
)
```

This calls `map()` once and creates a DOM snapshot. Changes to the array do not
insert, remove, or reorder list nodes.

Use `each()` for a reactive collection:

```typescript
tags.ul(
  each(
    () => controller.todos,
    (todo) => todo.id,
    (todo) => tags.li(() => todo().title),
  ),
)
```

`each()` accepts three functions:

- The collection reader returns an iterable, `null`, or `undefined`.
- The key selector receives the concrete item and must return a unique,
  stable key.
- The renderer receives a reactive item reader rather than an item snapshot.

Calling `todo()` reads the current value associated with that key. When a new
object replaces an old object with the same key, AngularTS preserves its DOM
nodes and updates bindings that read `todo()`. Reordering moves existing nodes,
new keys create nodes, and removed keys dispose their nodes and bindings.

Duplicate keys are rejected through `$exceptionHandler`. Keep keys stable and
unique for the lifetime of each logical item.

## Create dynamic and namespaced elements

Use `tag()` when the HTML tag name is dynamic or cannot use property access:

```typescript
const widget = tag('account-summary', {accountId: controller.accountId});
```

Use `tagNS()` or call `tags` with a namespace URI for SVG, MathML, or another
XML namespace:

```typescript
const svg = tags('http://www.w3.org/2000/svg');

const icon = svg.svg(
  {viewBox: '0 0 24 24'},
  svg.circle({cx: 12, cy: 12, r: 10}),
);

const otherCircle = tagNS(
  'http://www.w3.org/2000/svg',
  'circle',
  {cx: 12, cy: 12, r: 10},
);
```

## Access the view context

Component views receive a `ComponentViewContext` with these members:

| Member | Purpose |
| --- | --- |
| `controller` | The initialized component controller. |
| `scope` | The scope that owns reactive bindings and generated DOM. |
| `element` | The component host element. |
| `transclude` | The transclusion function when transclusion is enabled. |
| `onDestroy` | Registers view-owned cleanup and returns a cancellation function. |

Directive views receive a `DirectiveViewContext`. It has the same lifecycle and
DOM members and also exposes `required`, containing controllers resolved from
the directive's `require` declaration. The directive's own `controller` is
`undefined` when it does not declare one.

## Create a directive view

Directives can provide `view` instead of a template. Generated nodes continue
through the normal compile and link pipeline, so registered directives on those
nodes remain available.

```typescript
app.directive('liveClock', () => ({
  view: ({scope, onDestroy}) => {
    scope.now = new Date();

    const timer = window.setInterval(() => {
      scope.now = new Date();
    }, 1000);

    onDestroy(() => window.clearInterval(timer));

    return tags.time(
      {datetime: () => scope.now.toISOString()},
      () => scope.now.toLocaleTimeString(),
    );
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

```typescript
view: ({onDestroy}) => {
  const abort = new AbortController();
  const socket = new WebSocket('/events');

  onDestroy(() => abort.abort());
  const cancelSocketCleanup = onDestroy(() => socket.close());

  // Call cancelSocketCleanup() if ownership moves somewhere else.
  return tags.div('Connected');
}
```

Cleanup runs when either the owning scope is destroyed or the host element is
deallocated. A cleanup registered after destruction runs immediately. Cleanup
errors are reported through `$exceptionHandler`.

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
