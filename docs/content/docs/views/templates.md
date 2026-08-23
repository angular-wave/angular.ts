---
title: 'HTML template views'
linkTitle: 'HTML Templates'
weight: 10
description:
  'Render a component with readable HTML, interpolation, directives, controller
  methods, and explicit bindings.'
---

## What you will build

Render the task count as a small template component.

## Before you start

Read [components]({{< relref "/docs/concepts/components" >}}).

```js
angular.module('todoApp').component('todoSummary', {
  bindings: { remaining: '<' },
  template: `
    <p>
      <strong>{{ $ctrl.remaining }}</strong>
      tasks remaining
    </p>
  `,
});
```

```html
<todo-summary remaining="remaining()"></todo-summary>
```

The binding is the component's public input. `$ctrl` is the component controller
in its template. Interpolation converts the value to displayed text and keeps
that text current.

Templates are a strong default for mostly static HTML, designer-edited markup,
and teams that want structure visible without reading JavaScript.

## Next step

Learn [template
expressions]({{< relref "/docs/concepts/templates-interpolation" >}}) or compare
[typed views]({{< relref "/docs/views/typed" >}}).
