import { expect, test } from "@playwright/test";

function trackRuntimeRequests(page: import("@playwright/test").Page): string[] {
  const runtimeRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/dist/angular-ts.umd.js")) {
      runtimeRequests.push(url);
    }
  });

  return runtimeRequests;
}

test("Kotlin basic app runs against the dist runtime", async ({ page }) => {
  const runtimeRequests = trackRuntimeRequests(page);

  await page.goto(
    "/integrations/kotlin/examples/basic_app/build/dist/js/productionExecutable/index.html",
  );

  await expect(
    page.locator('script[src="/dist/angular-ts.umd.js"]'),
  ).toHaveCount(1);
  expect(runtimeRequests.length).toBeGreaterThan(0);

  const card = page.locator("kotlin-greeting .kotlin-card");
  await expect(card).toHaveAttribute("data-kotlin-ready", "true");
  await expect(page.locator("kotlin-greeting .service-message")).toHaveText(
    "HELLO, KOTLIN FROM KOTLIN",
  );

  await expect(page.locator("kotlin-greeting .detail")).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle detail" }).click();
  await expect(page.locator("kotlin-greeting .detail")).toHaveText(
    "Directive linked",
  );
});

test("Kotlin web components render inputs and dispatch events", async ({
  page,
}) => {
  const runtimeRequests = trackRuntimeRequests(page);

  await page.goto(
    "/integrations/kotlin/examples/web_components/build/dist/js/productionExecutable/index.html",
  );

  await expect(
    page.locator('script[src="/dist/angular-ts.umd.js"]'),
  ).toHaveCount(1);
  expect(runtimeRequests.length).toBeGreaterThan(0);

  const host = page.locator("#kotlin-web-components");
  await expect(host).toHaveAttribute("data-ready-events", "2");
  await expect(page.getByRole("button", { name: "Orders: 0" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inventory: active" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Orders: 0" }).click();
  await expect(page.getByRole("button", { name: "Orders: 1" })).toBeVisible();

  await page.getByRole("button", { name: "Inventory: active" }).click();
  await expect(
    page.getByRole("button", { name: "Inventory: idle" }),
  ).toBeVisible();
});
