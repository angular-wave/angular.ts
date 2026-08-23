---
title: Test application behavior
weight: 60
description:
  Allocate AngularTS tests across plain logic, typed contracts, browser
  integration, lifecycle, and failure boundaries.
---

## Use the narrowest layer that can fail

Test transformations and domain transitions as plain TypeScript. Compile typed
component views to catch invalid model properties, event types, and DOM property
names. Use a browser for compilation, directives, focus, routing, and reactive
rendering.

```ts
test('task form prevents duplicate submission', async ({ page }) => {
  await page.goto('/tasks');
  await page.getByLabel('Task title').fill('Write tests');
  await page.getByRole('button', { name: 'Add task' }).dblclick();
  await expect(page.getByRole('listitem')).toHaveCount(1);
});
```

Select by role, label, visible text, or stable application identifiers. Scope
IDs, generated comments, internal CSS classes, and scheduler timing are
implementation details.

For each asynchronous screen, cover loading, stale data, empty success,
recoverable failure, retry, cancellation on navigation, and late completion.
Control server responses rather than adding sleeps. For resource owners, enter
and leave repeatedly and assert listener and connection counts return to
baseline.

Run critical browser contracts against the production bundle.
