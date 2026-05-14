import { expect, test } from "@playwright/test";

test("Closure compiled todo demo runs against AngularTS public API", async ({
  page,
}) => {
  await page.goto("/integrations/closure/demo/index.html");

  await expect(
    page.getByRole("heading", { name: "Closure Todo App" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Application JavaScript compiled with Closure ADVANCED and strict type checks",
    ),
  ).toBeVisible();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.locator("#closure-remaining")).toContainText(
    "2 of 2 remaining",
  );

  await page.getByLabel("New todo").fill("Ship Closure integration");
  await page.getByLabel("New todo").press("Enter");
  await expect(page.locator(".todo-row")).toHaveCount(3);
  await expect(page.getByText("Ship Closure integration")).toBeVisible();
  await expect(page.locator("#closure-remaining")).toContainText(
    "3 of 3 remaining",
  );

  const newTodo = page
    .locator(".todo-row")
    .filter({ hasText: "Ship Closure integration" });

  await newTodo.getByRole("checkbox").click();
  await expect(newTodo.getByRole("checkbox")).toBeChecked();
  await expect(newTodo).toHaveClass(/is-done/);
  await expect(page.locator("#closure-remaining")).toContainText(
    "2 of 3 remaining",
  );
  await expect(
    page.evaluate(() => {
      const scope = (window as any).angular.getScope(
        document.querySelector("main"),
      );

      return scope.$ctrl.tasks.find(
        (todo: Record<string, unknown>) =>
          todo.task === "Ship Closure integration",
      )?.done;
    }),
  ).resolves.toBe(true);

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.getByText("Ship Closure integration")).toHaveCount(0);
});

test("Closure demo loads the compiled bundle and exposes the todo controller", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/integrations/closure/demo/index.html");
  await expect(
    page.getByRole("heading", { name: "Closure Todo App" }),
  ).toBeVisible();

  const controller = await page.evaluate(() => {
    const scope = (window as any).angular.getScope(document.querySelector("main"));
    const ctrl = scope.$ctrl;

    return {
      hasAdd: typeof ctrl.add === "function",
      hasArchive: typeof ctrl.archive === "function",
      hasSetDone: typeof ctrl.setDone === "function",
      hasSubmit: typeof ctrl.submit === "function",
      hasToggle: typeof ctrl.toggle === "function",
      remainingCount: ctrl.remainingCount,
      taskCount: ctrl.tasks.length,
      taskKeys: ctrl.tasks.map((todo: Record<string, unknown>) =>
        Object.keys(todo).sort(),
      ),
    };
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(controller).toEqual({
    hasAdd: true,
    hasArchive: true,
    hasSetDone: true,
    hasSubmit: true,
    hasToggle: true,
    remainingCount: 2,
    taskCount: 2,
    taskKeys: [
      ["done", "id", "task"],
      ["done", "id", "task"],
    ],
  });
});
