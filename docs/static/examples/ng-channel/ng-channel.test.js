import { test, expect } from '@playwright/test';

const TEST_URL = 'docs/static/examples/ng-channel/ng-channel-test.html';

// test('updates empty ng-channel element with published epoch', async ({
//   page,
// }) => {
//   await page.goto(TEST_URL);
//   await page.content();
//   const epochDiv = page.locator('[ng-channel="epoch"]');
//   await expect(epochDiv).toHaveText('');

//   await page.click('text=Publish epoch');

//   // Wait for innerHTML to be updated
//   await expect(epochDiv).not.toHaveText('');
//   await expect(epochDiv).toContainText(/^\d+$/); // Should be a timestamp
// });

test('updates templated ng-channel element with published user data', async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.content();
  const userDiv = page.locator('[ng-channel="user"]');
  await expect(userDiv).toHaveText(/Hello\s*/);

  await page.click('text=Publish name');

  await expect(userDiv).toContainText('Hello John Smith');
});
