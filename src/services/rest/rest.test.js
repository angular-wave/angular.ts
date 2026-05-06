import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

const TEST_URL = "src/services/rest/rest.html";
const EXAMPLE_URL = "src/services/rest/rest-example.html";
const CRUD_DEMO_URL = "src/services/rest/rest-crud-demo.html";

test("unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, TEST_URL);
});

test("basic rest demo loads users with shared demo styles", async ({
  page,
}) => {
  await page.goto(EXAMPLE_URL);

  await expect(
    page.locator('link[href="/src/services/rest/rest-demo.css"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "REST Demo" })).toBeVisible();
  await page.getByRole("button", { name: "Load" }).click();

  await expect(page.getByRole("status")).toHaveText("Loaded 2 users");
  await expect(page.getByRole("row", { name: /Bob/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Ken/ })).toBeVisible();
});

test("crud rest demo creates, reads, updates, and deletes a task", async ({
  page,
}) => {
  await page.request.post("/api/tasks/reset");

  const apiRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.pathname.startsWith("/api/tasks")) {
      apiRequests.push(`${request.method()} ${url.pathname}`);
    }
  });

  await page.goto(CRUD_DEMO_URL);

  await expect(page.getByRole("heading", { name: "REST CRUD" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Loaded 3 tasks");
  await expect(
    page.getByRole("button", { name: "Network first" }),
  ).toBeDisabled();
  await expect(
    page.locator(".item-row").filter({ hasText: "Write API notes" }),
  ).toBeVisible();

  await page.getByLabel("Title").fill("Publish CRUD walkthrough");
  await page.getByLabel("Owner").fill("Mira");
  await page.getByLabel("Status").selectOption("Open");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("status")).toHaveText("Created task #4");

  let item = page
    .locator(".item-row")
    .filter({ hasText: "Publish CRUD walkthrough" });
  await expect(item).toContainText("Mira");
  await expect(item).toContainText("Open");

  await item.getByRole("button", { name: "Read" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit task #4" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Read task #4");

  await page.getByLabel("Title").fill("Publish CRUD walkthrough v2");
  await page.getByLabel("Status").selectOption("Done");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("status")).toHaveText("Updated task #4");

  item = page
    .locator(".item-row")
    .filter({ hasText: "Publish CRUD walkthrough v2" });
  await expect(item).toContainText("Done");

  await item.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("status")).toHaveText("Deleted task #4");
  await expect(
    page.locator(".item-row").filter({
      hasText: "Publish CRUD walkthrough v2",
    }),
  ).toHaveCount(0);

  expect(apiRequests).toEqual(
    expect.arrayContaining([
      "GET /api/tasks",
      "POST /api/tasks",
      "GET /api/tasks/4",
      "PUT /api/tasks/4",
      "DELETE /api/tasks/4",
    ]),
  );
});

test("crud rest demo switches cache strategy", async ({ page }) => {
  await page.request.post("/api/tasks/reset");
  await page.goto(CRUD_DEMO_URL);

  await expect(page.getByRole("status")).toHaveText("Loaded 3 tasks");

  await page.getByRole("button", { name: "Cache first" }).click();
  await expect(
    page.getByRole("button", { name: "Cache first" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Using Cache first");

  await page.getByRole("button", { name: "Stale while revalidate" }).click();
  await expect(
    page.getByRole("button", { name: "Stale while revalidate" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText(
    /Using Stale while revalidate|Cache refreshed from server/,
  );
});
