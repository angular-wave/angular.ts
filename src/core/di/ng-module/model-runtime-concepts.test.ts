import { expect, test } from "@playwright/test";

test("SQLite WASM concept writes plain model snapshots through sync", async ({
  page,
}) => {
  await page.goto("/concepts/sqlite-wasm/");

  await expect(page.getByText(/Status: ready/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(/Rows: 3/)).toBeVisible();

  await page.getByRole("button", { name: "Add Task" }).click();

  await expect(page.getByText(/Rows: 4/)).toBeVisible();
  await expect(page.getByText(/Snapshot: v[1-9]/)).toBeVisible();
  await expect(page.getByText(/SQLite bytes: [1-9]/)).toBeVisible();

  await page.getByPlaceholder("Filter tasks").fill("SQLite");
  await page.getByRole("button", { name: "Apply Filter" }).click();

  await expect(page.getByText(/Rows: 1/)).toBeVisible();
});

test("Unity FPS concept syncs external runtime state through a model", async ({
  page,
}) => {
  await page.goto("/concepts/unity-fps/", { waitUntil: "domcontentloaded" });

  await page.waitForFunction(() => {
    const bridge = (
      window as unknown as {
        angularTsUnityFps?: { state(payload: string): void };
      }
    ).angularTsUnityFps;

    return typeof bridge?.state === "function";
  });

  await page.evaluate(() => {
    const bridge = (
      window as unknown as {
        angularTsUnityFps: { state(payload: string): void };
      }
    ).angularTsUnityFps;

    bridge.state(
      JSON.stringify({
        health: 74,
        ammo: 24,
        reserve: 84,
        targetsDestroyed: 3,
      }),
    );
  });

  await expect(page.getByText("24 / 84")).toBeVisible();
  await expect(
    page
      .locator("dt", { hasText: "Targets" })
      .locator("xpath=following-sibling::dd[1]"),
  ).toHaveText("3");
  await expect(page.getByTestId("sync-writes")).not.toHaveText("0");
  await expect(page.getByTestId("sync-keys")).toContainText("ammo");
  await expect(page.getByTestId("sync-keys")).toContainText("targetsDestroyed");
});

test("CodeMirror concept projects editor runtime changes into a model", async ({
  page,
}) => {
  await page.goto("/concepts/codemirror/");

  await expect(page.getByTestId("status")).toHaveText("ready", {
    timeout: 15000,
  });
  await expect(page.getByTestId("dirty")).toHaveText("no");

  await page.getByRole("button", { name: "Insert Log" }).click();

  await expect(page.getByTestId("model-text")).toContainText(
    "AngularTS model sync",
  );
  await expect(page.getByTestId("dirty")).toHaveText("yes");
  await expect(page.getByTestId("changes")).not.toHaveText("0");

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("dirty")).toHaveText("no");

  await page.getByRole("button", { name: "Rename" }).click();
  await expect(
    page.getByRole("heading", { name: "runtime-proof.js" }),
  ).toBeVisible();
});

test("xterm concept projects terminal session state into a model", async ({
  page,
}) => {
  await page.goto("/concepts/xterm/");

  await expect(page.getByTestId("terminal-status")).toHaveText("ready", {
    timeout: 15000,
  });
  await expect(page.getByTestId("terminal-connected")).toHaveText("yes");

  await page.getByRole("button", { name: "Ping" }).click();

  await expect(page.getByTestId("terminal-last")).toHaveText("ping");
  await expect(page.getByTestId("terminal-lines")).toHaveText("1");

  await page.getByRole("button", { name: "Disconnect" }).click();

  await expect(page.getByTestId("terminal-status")).toHaveText("disconnected");
  await expect(page.getByTestId("terminal-connected")).toHaveText("no");
});

test("PDF.js concept projects document viewer state into a model", async ({
  page,
}) => {
  await page.goto("/concepts/pdfjs/");

  await expect(page.getByTestId("pdf-status")).toHaveText("ready", {
    timeout: 20000,
  });
  await expect(page.getByTestId("pdf-page")).toContainText("1 /");
  await expect(page.getByTestId("pdf-renders")).not.toHaveText("0");

  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByTestId("pdf-page")).toContainText("2 /");
  await expect(page.getByTestId("pdf-status")).toHaveText("ready");
});

test("Web Worker concept synchronizes compute results through a model", async ({
  page,
}) => {
  await page.goto("/concepts/worker-compute/");

  await expect(page.getByTestId("worker-status")).toHaveText("idle");

  await page.getByRole("button", { name: "Run" }).click();

  await expect(page.getByTestId("worker-status")).toHaveText("complete", {
    timeout: 10000,
  });
  await expect(page.getByTestId("worker-progress")).toHaveText("100%");
  await expect(page.getByTestId("worker-run")).toHaveText("1");
  await expect(page.getByTestId("worker-result")).not.toHaveText("0");
});

test("Virtual grid concept projects viewport and selection into a model", async ({
  page,
}) => {
  await page.goto("/concepts/virtual-grid/");

  await expect(page.getByTestId("grid-status")).toHaveText("ready");
  await expect(page.getByTestId("grid-selected")).toHaveText("Account 001");
  await expect(page.getByTestId("grid-visible")).not.toHaveText("0 + 0");

  await page.getByPlaceholder("Filter accounts").fill("East");
  await page.getByRole("button", { name: "Apply Filter" }).click();

  await expect(page.getByTestId("grid-selected")).toHaveText("Account 003");
  await expect(page.getByTestId("grid-region")).toHaveText("East");

  await page.locator("#grid-runtime .grid-row").nth(1).click();

  await expect(page.getByTestId("grid-selected")).toHaveText("Account 007");
  await expect(page.getByTestId("grid-region")).toHaveText("East");
});
