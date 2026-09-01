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

## Template or typed view

A component can render an HTML `template`, load a `templateUrl`, or provide a
typed `view` function. These options share component registration, dependency
injection, directives, child compilation, and cleanup.

Read [choose a view style]({{< relref "/docs/views/choose" >}}) before selecting
one for a new component.
