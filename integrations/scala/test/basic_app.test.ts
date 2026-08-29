import { expect, test } from "@playwright/test";

test("Scala.js todo app matches the ClojureScript authoring workflow", async ({
  page,
}) => {
  await page.goto("/integrations/scala/examples/basic_app/index.html");

  await expect(
    page.getByRole("heading", { name: "Scala.js Todo App" }),
  ).toBeVisible();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.locator("#scala-count")).toContainText("2 todos");

  const input = page.getByLabel("New Scala.js todo");
  await input.fill("Ship Scala.js integration");
  await input.press("Enter");
  await expect(page.locator(".todo-row")).toHaveCount(3);
  await expect(input).toHaveValue("");

  const newTodo = page
    .locator(".todo-row")
    .filter({ hasText: "Ship Scala.js integration" });

  await newTodo.getByRole("checkbox").check();
  await expect(newTodo).toHaveClass(/is-done/);
  await expect(
    page.evaluate(() => {
      const scope = (window as any).angular.getScope(
        document.querySelector("main"),
      );

      return scope.$ctrl.tasks.find(
        (todo: Record<string, unknown>) =>
          todo.task === "Ship Scala.js integration",
      )?.done;
    }),
  ).resolves.toBe(true);

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.getByText("Ship Scala.js integration")).toHaveCount(0);
});
