import { expect, test } from "@playwright/test";

const TEST_URL = "docs/static/examples/task-board/task-board-demo.html";

test("task-board tutorial adds a trimmed task", async ({ page }) => {
  await page.goto(TEST_URL);

  const input = page.getByLabel("Task");
  const addButton = page.getByRole("button", { name: "Add" });

  await expect(addButton).toBeDisabled();
  await input.fill("  Write tests  ");
  await expect(addButton).toBeEnabled();
  await addButton.click();

  await expect(page.getByRole("listitem")).toHaveText([
    "Read the guide",
    "Write tests",
  ]);
  await expect(input).toHaveValue("");
  await expect(addButton).toBeDisabled();
});
