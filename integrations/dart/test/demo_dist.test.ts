import { expect, test } from "@playwright/test";

test("Dart todo demo runs against the dist runtime", async ({ page }) => {
  const runtimeRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/dist/angular-ts.umd.js")) {
      runtimeRequests.push(url);
    }
  });

  await page.goto("/integrations/dart/example/basic_app/");

  await expect(
    page.locator('script[src="/dist/angular-ts.umd.js"]'),
  ).toHaveCount(1);
  expect(runtimeRequests.length).toBeGreaterThan(0);

  const rows = page.locator("todo-list .todo-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Learn AngularTS");
  await expect(rows.nth(1)).toContainText("Build an AngularTS app");

  await page.getByLabel("Todo title").fill("Review Dart facade");
  await page.getByLabel("Todo title").press("Enter");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("Review Dart facade");

  await rows.nth(2).getByRole("checkbox").check();
  await expect(rows.nth(2).getByRole("checkbox")).toBeChecked();
  await expect(rows.nth(2)).toHaveClass(/done/);

  await page.getByRole("button", { name: "Archive" }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator("todo-list")).not.toContainText(
    "Review Dart facade",
  );
});
