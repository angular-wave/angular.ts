import { expect, test } from "@playwright/test";
import type { Angular } from "../angular.ts";

const RUNNER = "/docs/static/examples/cookbook/runner.html";
const recipes = [
  "inline-edit.md",
  "delete-row.md",
  "active-search.md",
  "dependent-selects.md",
  "infinite-scroll.md",
  "optimistic-update.md",
  "session-expiration.md",
  "cached-reference-data.md",
  "upload-cancel.md",
  "server-dialog.md",
  "accessible-requests.md",
  "progressive-enhancement.md",
  "server-validation.md",
  "csrf-protected-form.md",
  "confirm-delete.md",
  "edit-conflict.md",
  "retry-failed-read.md",
  "server-pagination.md",
  "download-file.md",
  "safe-html-fragment.md",
  "request-id.md",
  "rate-limit.md",
  "background-job.md",
  "idempotent-write.md",
  "multi-step-form.md",
  "bulk-action.md",
  "archive-restore.md",
  "permission-denied.md",
  "url-filter.md",
  "logout.md",
  "unique-race.md",
  "money-values.md",
  "dates-time-zones.md",
  "opaque-identifiers.md",
  "safe-redirect.md",
  "error-envelope.md",
  "content-negotiation.md",
  "rich-text.md",
  "password-form.md",
  "secret-redaction.md",
  "focus-first-error.md",
  "empty-state.md",
  "focus-after-swap.md",
  "feature-flag.md",
  "audit-trail.md",
  "framework-observe.md",
  "framework-model.md",
];

function firstHtmlSnippet(markdown: string): string | undefined {
  return markdown.match(/```html\n([\s\S]*?)```/u)?.[1];
}

for (const recipe of recipes) {
  test(`cookbook example compiles: ${recipe}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route("**/orders?**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html", body: "" });
    });
    await page.route("**/account/delete-dialog", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html", body: "" });
    });
    await page.goto(RUNNER);
    await page.waitForFunction(() => "angular" in globalThis);

    const response = await page.request.get(
      `/docs/content/docs/cookbook/${recipe}`,
    );
    expect(response.ok()).toBe(true);
    const html = firstHtmlSnippet(await response.text());
    if (!html) throw new Error(`${recipe} has no executable HTML example`);
    await page.evaluate((source) => {
      const app = document.querySelector<HTMLElement>("#app")!;
      const host = document.createElement("section");
      host.innerHTML = source;
      app.append(host);
      const runtime = (globalThis as typeof globalThis & { angular: Angular })
        .angular;
      const injector = runtime.getInjector(app);
      injector.get("$compile")(host)(injector.get("$rootScope").new());
    }, html);
    await page.waitForTimeout(20);
    expect(errors).toEqual([]);

    if (recipe === "framework-model.md") {
      await page.evaluate(() => {
        const runtime = (globalThis as typeof globalThis & { angular: Angular })
          .angular;
        const app = document.querySelector<HTMLElement>("#app")!;
        const cart = runtime.getInjector(app).get<{
          items: { name: string }[];
        }>("cart");
        cart.items.push({ name: "Keyboard" });
      });

      await expect(page.getByText("Cart items: 1")).toBeVisible();
      await expect(page.getByText("Keyboard")).toBeVisible();
    }
  });
}
