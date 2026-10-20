---
title: 'Directive Overview'
weight: 290
description:
  'Learn how AngularTS directives attach behavior to HTML, how built-in
  directive groups are organized, and how to create custom directives.'
---

Directives are how AngularTS attaches behavior and structure to HTML. A
directive is a marker on a DOM element or attribute that tells `$compile` to
attach behavior, transform DOM, wire events, create scopes, or connect
controllers.

Every built-in directive in AngularTS is applied as an HTML attribute using the
`ng-` prefix. The compiler normalizes prefixes, so `ng-bind`, `data-ng-bind`,
and `x-ng-bind` all match the same directive.

Exact custom directive contracts live in TypeDoc:

- [`Directive`](../../../typedoc/interfaces/Directive.html)
- [`DirectiveFactory`](../../../typedoc/types/DirectiveFactory.html)
- [`DirectiveFactoryFn`](../../../typedoc/types/DirectiveFactoryFn.html)
- [`Component`](../../../typedoc/interfaces/Component.html)
- [`CompileFn`](../../../typedoc/types/CompileFn.html)
- [`LinkFn`](../../../typedoc/interfaces/LinkFn.html)
- [`TranscludeFn`](../../../typedoc/interfaces/TranscludeFn.html)

## How Directives Are Matched

The `restrict` option controls where a directive can appear.

| Restrict    | Match form           | Example                        |
| ----------- | -------------------- | ------------------------------ |
| `A`         | Attribute            | `<span ng-bind="name"></span>` |
| `E`         | Element              | `<my-widget></my-widget>`      |
| `AE` / `EA` | Attribute or element | `<div ng-form>` or `<ng-form>` |

Attribute directives are the common case in AngularTS. They keep the host
element in place and augment it.

## Built-In Directive Groups

AngularTS groups its built-in directives by the user-facing job they perform.
Keep these groups in mind when choosing where to look in the docs.

| Group                                                          | Purpose                                                  | Examples                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| [Data binding]({{< relref "/docs/directives/data-binding" >}}) | Synchronize scope data with the view                     | `ng-bind`, `ng-model`, `ng-class`, `ng-style`               |
| [Structural]({{< relref "/docs/directives/structural" >}})     | Add, remove, repeat, or switch DOM                       | `ng-if`, `ng-repeat`, `ng-show`, `ng-hide`, `ng-switch`     |
| [Forms]({{< relref "/docs/directives/forms" >}})               | Track validity, dirty state, messages, and model options | `form`, `ng-model`, `ng-messages`, validators               |
| [HTTP]({{< relref "/docs/directives/http" >}})                 | Trigger declarative network work from the DOM            | `ng-get`, `ng-post`, `ng-put`, `ng-delete`, `ng-sse`        |
| [Animations]({{< relref "/docs/directives/animations" >}})     | Coordinate directive-driven animation hooks              | `animate`, `$animate`, CSS hooks                            |
| [Advanced]({{< relref "/docs/directives/advanced" >}})         | Connect browser APIs and integrations                    | `ng-worker`, `ng-wasm`, `ng-viewport`, `ng-pointer-capture` |

## Create A Custom Directive

Register directives on a module with `.directive(name, factory)`. The factory
returns a directive definition object.

```js
angular.createModule('demo', []).directive('highlight', () => {
  return {
    restrict: 'A',
    scope: {
      color: '@highlight',
    },
    link(scope, element) {
      const paint = (color) => {
        element.style.backgroundColor = color || 'yellow';
      };

      paint(scope.color);

      scope.watch('color', paint);
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
the directive needs local state. Use isolate scope bindings when the directive
is designed as a reusable widget with explicit inputs and callbacks.

```js
scope: {
  title: "@",
  value: "=",
  onSave: "&",
}
```

Prefer components for larger reusable UI pieces. Use directives for behaviors,
DOM integrations, structural transforms, and lightweight element coordination.

## Typed controller bindings

Declare controller properties to check directive binding names and callbacks in
TypeScript:

```ts
interface User {
  name: string;
}

class UserEditor {
  user!: User;
  onSave!: (locals: { user: User }) => void;

  save() {
    this.onSave({ user: this.user });
  }
}

angular.getModule('app').directive('userEditor', () => ({
  scope: {},
  controller: UserEditor,
  controllerAs: 'editor',
  bindToController: { user: '<sourceUser', onSave: '&saveUser' },
  template: '<button ng-click="editor.save()">{{ editor.user.name }}</button>',
}));
```

`usr: '<'` produces a type error because the controller declares `user`.
`user: '&'` also produces a type error because `user` is not a function.
Optional bindings, attribute aliases, and function-valued `<` or `=` inputs keep
their existing syntax. Programmatic views receive the inferred controller type
too.

The same directive is authored in HTML as:

```html
<div user-editor source-user="selectedUser" save-user="saveUser(user)"></div>
```

With `bindToController: true`, registration checks the bindings declared in
`scope` instead:

```ts
angular.getModule('app').directive('scopedUserEditor', () => ({
  controller: UserEditor,
  bindToController: true,
  scope: { user: '<sourceUser', onSave: '&saveUser' },
}));
```

With `bindToController: false` or an omitted setting, isolate-scope bindings
belong to the scope and may use names absent from the controller. An object in
`bindToController` checks that object's properties; separate `scope` bindings
remain independent.

Classes, dependency-annotated controllers, and factories returning typed
controller objects supply controller types. Named or untyped controllers stay
permissive; use `.directive<UserEditor>(...)` to supply a known controller type
explicitly. Stored definitions can use
[`ng.Directive<UserEditor>`](../../../typedoc/interfaces/Directive.html), and
factory types such as
[`ng.DirectiveFactory<UserEditor>`](../../../typedoc/types/DirectiveFactory.html)
accept a controller type too. Keep binding declarations and
`bindToController: true` literal with `as const` when storing otherwise
unannotated options. Widened `string` values cannot be checked for their
callback mode.

TypeScript checks the locals passed to `onSave()` in controller code. HTML
expressions keep their existing runtime evaluation.

## Next Steps

- [Data binding]({{< relref "/docs/directives/data-binding" >}})
- [Structural directives]({{< relref "/docs/directives/structural" >}})
- [Form directives]({{< relref "/docs/directives/forms" >}})
- [HTTP directives]({{< relref "/docs/directives/http" >}})
