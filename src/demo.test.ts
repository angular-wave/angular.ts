import { expect, test } from "@playwright/test";

test("root demo uses explicitly annotated controller dependencies", async ({
  page,
}) => {
  await page.goto("/");

  const greeting = page.getByRole("heading", { level: 3 });
  await expect(greeting).toHaveText("Hello");

  await page.getByRole("button", { name: "Greet" }).click();
  await expect(greeting).toHaveText("Hello !");
});
