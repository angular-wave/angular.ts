---
title: Test the application
description: Separate model tests from browser-level rendering checks.
weight: 60
---

Start with a fast controller test:

```ts
it('adds a trimmed task', () => {
  const board = new TaskBoard();
  board.draft = '  Write tests  ';
  board.submit();

  expect(board.tasks.at(-1)?.title).toBe('Write tests');
  expect(board.draft).toBe('');
});
```

Then verify the user-visible contract in a browser:

```ts
test('adds a task', async ({ page }) => {
  await page.goto('/tasks');
  await page.getByLabel('Task').fill('Write tests');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Write tests')).toBeVisible();
});
```

Test behavior, not internal scope fields or generated DOM comments. Keep network
outcomes deterministic.

## Checkpoint

Both the model test and browser test pass, including the loading failure case.

## Next step

[Prepare the application for production](../production/).
