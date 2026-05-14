import { expect, test } from "@playwright/test";

test("ClojureScript todo demo runs against generated AngularTS Closure types", async ({
  page,
}) => {
  await page.goto("/integrations/closure/clojurescript/demo/index.html");

  await expect(
    page.getByRole("heading", { name: "ClojureScript Todo App" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "ClojureScript compiled with Closure ADVANCED using generated AngularTS type hints",
    ),
  ).toBeVisible();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.locator("#cljs-remaining")).toContainText(
    "2 of 2 remaining",
  );

  await page
    .getByLabel("New ClojureScript todo")
    .fill("Ship ClojureScript integration");
  await page.getByLabel("New ClojureScript todo").press("Enter");
  await expect(page.locator(".todo-row")).toHaveCount(3);
  await expect(page.getByText("Ship ClojureScript integration")).toBeVisible();
  await expect(page.locator("#cljs-remaining")).toContainText(
    "3 of 3 remaining",
  );

  const newTodo = page
    .locator(".todo-row")
    .filter({ hasText: "Ship ClojureScript integration" });

  await newTodo.getByRole("checkbox").click();
  await expect(newTodo.getByRole("checkbox")).toBeChecked();
  await expect(newTodo).toHaveClass(/is-done/);
  await expect(page.locator("#cljs-remaining")).toContainText(
    "2 of 3 remaining",
  );
  await expect(
    page.evaluate(() => {
      const scope = (window as any).angular.getScope(
        document.querySelector("main"),
      );

      return scope.$ctrl.tasks.find(
        (todo: Record<string, unknown>) =>
          todo.task === "Ship ClojureScript integration",
      )?.done;
    }),
  ).resolves.toBe(true);

  await page.getByRole("button", { name: "Archive completed" }).click();
  await expect(page.locator(".todo-row")).toHaveCount(2);
  await expect(page.getByText("Ship ClojureScript integration")).toHaveCount(0);
});
