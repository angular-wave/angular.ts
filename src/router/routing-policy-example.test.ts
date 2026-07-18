import { expect, test } from "@playwright/test";

const TEST_URL = "docs/static/examples/routing-policy/policy.html";
const RETRY_FALLBACK_TEST_URL =
  "docs/static/examples/routing-policy/retry-fallback.html";
const RETENTION_TEST_URL = "docs/static/examples/routing-policy/retention.html";
const PARAM_TYPES_TEST_URL = "docs/static/examples/routing/param-types.html";
const STATE_LINKS_TEST_URL = "docs/static/examples/routing/state-links.html";
const SCROLL_FOCUS_TEST_URL = "docs/static/examples/routing/scroll-focus.html";

test("route policy docs example applies inherited and child navigation policies", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  await expect(
    page.getByRole("heading", { name: "Route policy demo" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Admin users" }).click();
  await expect(page.getByTestId("current-state")).toContainText("login");

  await page.getByRole("button", { name: "Public help" }).click();
  await expect(page.getByTestId("current-state")).toContainText("admin.help");

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Admin users" }).click();
  await expect(page.getByTestId("current-state")).toContainText("admin.users");

  await page.getByRole("button", { name: "Admin roles" }).click();
  await expect(page.getByTestId("current-state")).toContainText("forbidden");

  await page.getByRole("button", { name: "Grant roles" }).click();
  await page.getByRole("button", { name: "Admin roles" }).click();
  await expect(page.getByTestId("current-state")).toContainText("admin.roles");
});

test("route boundary docs example applies loading, fallback, and error boundaries", async ({
  page,
}) => {
  const diagnostics = async () =>
    page.evaluate(() =>
      JSON.parse(
        JSON.stringify((window as any).routingRetryFallbackDiagnostics),
      ),
    );
  const activeViewState = async () =>
    page.evaluate(() => {
      const injector = (window as any).angular.getInjector(
        document.getElementById("routing-retry-fallback-app"),
      );
      const view = injector.get("$state")._viewService;
      const nestedView = view._ngViews.find(
        (ngView: any) => ngView._fqn === "demo.$default",
      );

      return nestedView?._config?._path.at(-1).state.name ?? null;
    });

  await page.goto(RETRY_FALLBACK_TEST_URL);

  await expect(
    page.getByRole("heading", { name: "Router retry and fallback" }),
  ).toBeVisible();
  await expect(page.locator("#current-state")).toContainText("demo.base");

  let successStart = (await diagnostics()).succeeded.length;

  await page.getByRole("button", { name: "Transient state" }).click();

  await expect(page.locator("#current-state")).toContainText("demo.transient");
  await expect(page.locator("#last-action")).toContainText(
    "entered demo.transient",
  );
  const transientSuccesses = (await diagnostics()).succeeded.slice(
    successStart,
  );
  expect(transientSuccesses).toContain("demo.transient");
  await expect.poll(activeViewState).toBe("demo.transient");
  await expect(page.getByText("Transient state payload: ready")).toBeVisible();

  successStart = (await diagnostics()).succeeded.length;

  await page.getByRole("button", { name: "Stable failure" }).click();

  await expect(page.locator("#current-state")).toContainText("demo.fallback");
  await expect(page.locator("#last-action")).toContainText(
    "entered demo.fallback",
  );
  const fallbackSuccesses = (await diagnostics()).succeeded.slice(successStart);
  expect(fallbackSuccesses).toContain("demo.loading");
  expect(fallbackSuccesses).toContain("demo.fallback");
  await expect.poll(activeViewState).toBe("demo.fallback");
  await expect(
    page.getByText("Fallback recovery route reached."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.locator("#current-state")).toContainText("demo.base");
  await expect(page.locator("#last-action")).toContainText("entered demo.base");
  await expect.poll(activeViewState).toBe("demo.base");
  await expect(page.getByText("Base state")).toBeVisible();

  successStart = (await diagnostics()).succeeded.length;

  await page.getByRole("button", { name: "Error boundary" }).click();

  await expect(page.locator("#current-state")).toContainText("demo.fallback");
  await expect(page.locator("#last-action")).toContainText(
    "entered demo.fallback",
  );
  const boundarySuccesses = (await diagnostics()).succeeded.slice(successStart);
  expect(boundarySuccesses).toContain("demo.loading");
  expect(boundarySuccesses).toContain("demo.fallback");
  await expect.poll(activeViewState).toBe("demo.fallback");
  await expect(
    page.getByText("Fallback recovery route reached."),
  ).toBeVisible();
});

test("route retention docs example restores and evicts retained views", async ({
  page,
}) => {
  const diagnostics = async () =>
    page.evaluate(() =>
      JSON.parse(JSON.stringify((window as any).routingRetentionDiagnostics)),
    );

  await page.goto(RETENTION_TEST_URL);

  await expect(
    page.getByRole("heading", { name: "Route retention demo" }),
  ).toBeVisible();
  await expect(page.locator("#current-state")).toContainText("retention.tabA");
  await expect(page.locator("#compile-counts")).toHaveText("A:1 B:0 C:0");
  await expect.poll(diagnostics).toMatchObject({
    destroys: { a: 0, b: 0, c: 0 },
    schedulerRuns: { a: 0, b: 0, c: 0 },
    queuedWork: { a: 0, b: 0, c: 0 },
  });

  await page.getByRole("button", { name: "Tab A count: 0" }).click();
  await expect(
    page.getByRole("button", { name: "Tab A count: 1" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tab B" }).click();
  await expect(page.locator("#current-state")).toContainText("retention.tabB");
  await expect(page.locator("#compile-counts")).toHaveText("A:1 B:1 C:0");
  await expect.poll(diagnostics).toMatchObject({
    schedulerRuns: { a: 0, b: 0, c: 0 },
    queuedWork: { a: 1, b: 0, c: 0 },
  });

  await page.getByRole("button", { name: "Tab A" }).click();
  await expect(
    page.getByRole("button", { name: "Tab A count: 1" }),
  ).toBeVisible();
  await expect(page.locator("#compile-counts")).toHaveText("A:1 B:1 C:0");
  await expect(page.getByText("Resume events: 1")).toBeVisible();
  await expect.poll(diagnostics).toMatchObject({
    schedulerRuns: { a: 1, b: 0, c: 0 },
    queuedWork: { a: 0, b: 1, c: 0 },
  });

  await page.getByRole("button", { name: "Tab C" }).click();
  await expect(page.locator("#current-state")).toContainText("retention.tabC");
  await expect(page.locator("#compile-counts")).toHaveText("A:1 B:1 C:1");
  await expect.poll(diagnostics).toMatchObject({
    schedulerRuns: { a: 1, b: 0, c: 0 },
    queuedWork: { a: 1, b: 1, c: 0 },
  });

  await page.getByRole("button", { name: "Plain route" }).click();
  await expect(page.locator("#current-state")).toContainText("plain");
  await expect(page.locator("#compile-counts")).toHaveText("A:1 B:1 C:1");
  await expect.poll(diagnostics).toMatchObject({
    destroys: { a: 1, b: 1, c: 0 },
    schedulerRuns: { a: 1, b: 0, c: 0 },
    queuedWork: { a: 0, b: 0 },
  });
  expect((await diagnostics()).queuedWork.c).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Tab B" }).click();
  await expect(page.locator("#current-state")).toContainText("retention.tabB");
  await expect(
    page.getByRole("button", { name: "Tab B count: 0" }),
  ).toBeVisible();
  await expect(page.locator("#compile-counts")).toHaveText("A:1 B:2 C:1");
  await expect.poll(diagnostics).toMatchObject({
    destroys: { a: 1, b: 1, c: 0 },
    queuedWork: { a: 0, b: 0, c: 0 },
  });
  expect((await diagnostics()).schedulerRuns.c).toBeGreaterThan(0);
});

test("router param type docs example encodes hrefs and decodes matched URLs", async ({
  page,
}) => {
  await page.goto(PARAM_TYPES_TEST_URL);

  await expect(
    page.getByRole("heading", { name: "Router param type demo" }),
  ).toBeVisible();
  await expect(page.locator("#current-state")).toContainText("none");
  await expect(page.locator("#generated-href")).toContainText(
    "#!/item/ALPHA-12",
  );

  await page.goto(`${PARAM_TYPES_TEST_URL}#!/item/ALPHA-12`);

  await expect(page.locator("#current-state")).toContainText("item");
  await expect(page.locator("#current-slug")).toContainText("alpha-12");
  await expect(page.locator("#decoded-route-slug")).toContainText("alpha-12");
  await expect(page).toHaveURL(/#!\/item\/ALPHA-12$/);
});

test("router state link docs example binds literal routes and params", async ({
  page,
}) => {
  await page.goto(STATE_LINKS_TEST_URL);

  await expect(
    page.getByRole("heading", { name: "Router state link demo" }),
  ).toBeVisible();
  await expect(page.locator("#current-state")).toContainText("orders");
  await expect(page.locator("#orders-link")).toHaveAttribute(
    "href",
    "#!/orders",
  );
  await expect(page.locator("#order-detail-link")).toHaveAttribute(
    "href",
    "#!/orders/42",
  );
  await expect(page.locator("#orders-link")).toHaveAttribute(
    "data-state-active",
    "",
  );
  await expect(page.locator("#orders-link")).toHaveAttribute(
    "data-state-exact",
    "",
  );

  await page.getByRole("link", { name: "Order 42" }).click();

  await expect(page.locator("#current-state")).toContainText("orders.detail");
  await expect(page.locator("#current-order")).toContainText("42");
  await expect(page.locator("#order-detail-link")).toHaveAttribute(
    "data-state-active",
    "",
  );
  await expect(page.locator("#order-detail-link")).toHaveAttribute(
    "data-state-exact",
    "",
  );
  await expect(page.getByText("Order detail route loaded")).toBeVisible();
  await expect(page).toHaveURL(/#!\/orders\/42$/);
});

test("router scroll and focus docs example restores top and focuses route target", async ({
  page,
}) => {
  await page.goto(SCROLL_FOCUS_TEST_URL);

  await expect(
    page.getByRole("heading", { name: "Router scroll and focus demo" }),
  ).toBeVisible();
  await expect(page.locator("#current-state")).toContainText("home");

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Details" }).click();

  await expect(page.locator("#current-state")).toContainText("details");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id))
    .toBe("details-title");
});
