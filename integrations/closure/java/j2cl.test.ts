import { expect, test } from "@playwright/test";

test("J2CL todo demo registers its AngularTS module before bootstrap", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/integrations/closure/java/demo/index.html");

  await expect(
    page.getByRole("heading", { name: "J2CL Todo App" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Application JavaScript compiled from Java with J2CL and AngularTS JsInterop bindings",
    ),
  ).toBeVisible();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.locator("#j2cl-remaining")).toContainText(
    "2 of 2 remaining",
  );

  await page.getByLabel("New todo").fill("Ship J2CL integration");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".todo-row")).toHaveCount(3);
  await expect(page.getByText("Ship J2CL integration")).toBeVisible();
  await expect(page.locator("#j2cl-remaining")).toContainText(
    "3 of 3 remaining",
  );

  const addedRow = page
    .locator(".todo-row")
    .filter({ hasText: "Ship J2CL integration" });
  await expect(addedRow.locator(".todo-status")).toContainText("Open");
  await expect(addedRow).not.toHaveClass(/is-done/);

  const addedCheckbox = addedRow.getByRole("checkbox");
  await expect(addedCheckbox).not.toBeChecked();
  await addedCheckbox.click();

  await expect(addedCheckbox).toBeChecked();
  await expect(addedRow).toHaveClass(/is-done/);
  await expect(addedRow.locator(".todo-status")).toContainText("Done");
  await expect(page.locator("#j2cl-remaining")).toContainText(
    "2 of 3 remaining",
  );

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.getByText("Ship J2CL integration")).toHaveCount(0);
  expect(errors).toEqual([]);
});
