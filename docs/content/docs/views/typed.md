---
title: 'Type-safe component views'
linkTitle: 'Programmatic views'
weight: 20
description:
  'Construct component DOM in TypeScript with typed tags, properties, events,
  controller access, and reactive reader functions.'
---

## What you will build

Render a task form whose controller properties and event handlers are checked by
TypeScript.

## Before you start

Install the npm package, enable TypeScript, and read
[components]({{< relref "/docs/concepts/components" >}}).

```ts
import { angular } from '@angular-wave/angular.ts';

class TodoForm {
  draft = '';
  add() {}
}

const { tags } = angular.view;
const app = angular.module('todoApp', []);

app.component('todoForm', {
  controller: TodoForm,
  view: ({ controller }) =>
    tags.form(
      {
        onsubmit: (event) => {
          event.preventDefault();
          controller.add();
        },
      },
      tags.input({
        value: () => controller.draft,
        oninput: (event) => {
          controller.draft = (event.currentTarget as HTMLInputElement).value;
        },
      }),
      tags.button({ disabled: () => !controller.draft.trim() }, 'Add'),
    ),
});
```

A function in a child or property position is a reactive reader. AngularTS runs
it, records the controller values it reads, and updates that DOM position when
those values change. A plain value is a snapshot.

Typed views are useful when compile-time model-to-view checks, dynamic element
construction, native DOM properties, or direct browser API integration matter.

## Next step

Learn [collections and
cleanup]({{< relref "/docs/views/collections-and-cleanup" >}}).
