---
title: Build the form
description:
  Bind typed DOM events, validation state, and a reactive disabled property.
weight: 40
---

Add `draft` and a submit method:

```ts
draft = "";

submit() {
  const title = this.draft.trim();
  if (!title) return;
  this.add(title);
  this.draft = "";
}
```

Add the form before the list:

```ts
import { button, form, input, label } from '@angular-wave/angular.ts';

form(
  {
    onsubmit: (event) => {
      event.preventDefault();
      controller.submit();
    },
  },
  label({ htmlFor: 'new-task' }, 'Task'),
  input({
    id: 'new-task',
    value: () => controller.draft,
    oninput: (event) => {
      controller.draft = (event.currentTarget as HTMLInputElement).value;
    },
  }),
  button({ disabled: () => !controller.draft.trim() }, 'Add'),
);
```

The callback expresses reactive intent directly. No separate computed wrapper is
required.

## Checkpoint

The button is disabled for blank input. Submitting valid text adds a row and
clears the input.

## Next step

[Add routing and initial server data](../routing-and-data/).
