---
title: 'Components'
weight: 80
description:
  'Understand components as registered UI units with a controller, inputs,
  lifecycle, and either an HTML template or typed view.'
---

A component is a reusable UI unit registered on a module. It owns a DOM region,
an optional controller, explicit inputs, and one rendering definition.

```js
angular.getModule('todoApp').component('todoSummary', {
  bindings: { count: '<' },
  template: '<strong>{{ $ctrl.count }} remaining</strong>',
});
```

Use it as an HTML element:

```html
<todo-summary count="remaining()"></todo-summary>
```

The module registration makes the component available to compiled DOM in that
application. No annotation syntax, decorator, separate mount call, or global
custom-element registration is required.

## Controller and bindings

The controller stores component behavior and local state. In a template, `$ctrl`
refers to that controller. Bindings define the component's public inputs and
outputs instead of exposing its internal scope.

In TypeScript, declaring the controller properties lets registration check
binding names and callback properties:

```ts
interface User {
  id: number;
  name: string;
}

class UserCard {
  user!: User;
  count = 0;
  onSave!: (locals: { user: User }) => void;

  save() {
    this.onSave({ user: this.user });
  }
}

angular.getModule('todoApp').component('userCard', {
  controller: UserCard,
  bindings: { user: '<', count: '=', onSave: '&' },
  template: '<button ng-click="$ctrl.save()">{{ $ctrl.user.name }}</button>',
});
```

A binding named `usr` produces a type error because the controller declares
`user`. Using `count: '&'` also produces a type error because `count` is not a
function. The inferred controller type is available in programmatic views too.
Function-valued properties can still use `<` or `=` when the function itself is
the bound value.

The HTML authoring syntax stays the same:

```html
<user-card
  user="selectedUser"
  count="saveCount"
  on-save="saveUser(user)"
></user-card>
```

The object passed to `onSave()` supplies the named local `user` to the parent
expression. TypeScript checks that object when calling the controller's typed
function; it does not typecheck expressions inside HTML strings.

Optional bindings and attribute aliases keep their existing syntax, such as
`user: '<?sourceUser'` and `onSave: '&?saveUser'`. Classes, dependency-annotated
controllers, and factories that return typed objects supply controller types.
Registrations without a controller or using only a controller name stay
permissive unless you supply a controller type explicitly.

For separately declared options, use `satisfies`
[`ng.ComponentDefinition<UserCard>`](../../../typedoc/types/ComponentDefinition.html)
to check the definition. Keep literal binding values with `as const` when you
want callback checks on an otherwise unannotated options object. A value widened
to `string` cannot be checked for its binding mode until runtime.

## Template or typed view

A component can render an HTML `template`, load a `templateUrl`, or provide a
typed `view` function. These options share component registration, dependency
injection, directives, child compilation, and cleanup.

Read [choose a view style]({{< relref "/docs/views/choose" >}}) before selecting
one for a new component.
