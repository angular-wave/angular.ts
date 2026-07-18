import { expect, test } from "@playwright/test";

const TEST_URL = "docs/static/examples/model/user-model.html";

test("model docs example keeps controller bindings reactive", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  await expect(page.getByTestId("header-name")).toHaveText("John");
  await expect(page.getByTestId("header-status")).toContainText("guest");
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.getByLabel("Name").fill("Ada");

  await expect(page.getByTestId("header-name")).toHaveText("Ada");

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByTestId("header-status")).toContainText("signed in");
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByTestId("header-name")).toHaveText("John");
  await expect(page.getByTestId("header-status")).toContainText("guest");
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("model docs example can persist through a sync target", async ({
  page,
}) => {
  await page.goto("docs/static/examples/model/settings-sync.html");

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByTestId("summary")).toHaveText("light / comfortable");

  await page.getByLabel("Theme").selectOption("dark");
  await page.getByLabel("Compact").check();
  await expect(page.getByTestId("summary")).toHaveText("dark / compact");
  await expect(page.getByTestId("sync-count")).not.toHaveText("0");

  await page.reload();

  await expect(page.getByTestId("summary")).toHaveText("dark / compact");
});
