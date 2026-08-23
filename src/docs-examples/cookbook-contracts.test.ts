import { expect, type Page, test } from "@playwright/test";

const RUNNER = "/docs/static/examples/cookbook/runner.html";

async function readRecipe(page: Page, name: string): Promise<string> {
  await page.goto(RUNNER);
  const response = await page.request.get(
    `/docs/content/docs/cookbook/${name}`,
  );
  expect(response.ok()).toBe(true);
  return response.text();
}

test("progressive form keeps its native submission contract", async ({
  page,
}) => {
  const source = await readRecipe(page, "progressive-enhancement.md");

  expect(source).toContain('action="/orders"');
  expect(source).toContain('method="post"');
  expect(source).toContain('ng-post="/orders"');
  expect(source).toContain('data-state-success="orders"');
  expect(source).toContain('on-error="errors = $res"');
});

test("accessible request exposes status and a stable focus target", async ({
  page,
}) => {
  const source = await readRecipe(page, "accessible-requests.md");

  expect(source).toContain('aria-live="polite"');
  expect(source).toContain("ng-el");
  expect(source).toContain("focus");
});

test("security recipe keeps authorization on the server", async ({ page }) => {
  const source = await readRecipe(page, "secure-request.md");

  expect(source).toContain(
    "Server verifies this user may act on this resource",
  );
  expect(source).toContain("None of them authorize a server operation");
  expect(source).toContain("without the CSRF proof");
});

test("request control covers stale reads and duplicate writes", async ({
  page,
}) => {
  const source = await readRecipe(page, "control-repeat-requests.md");

  expect(source).toContain("An old search overwrites a newer one");
  expect(source).toContain("make the server idempotent");
  expect(source).toContain('xhrStatus === "abort"');
});
