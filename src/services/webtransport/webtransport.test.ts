import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("webtransport unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/services/webtransport/webtransport.html?random=false",
  );
});

test("webtransport demo receives datagram and stream data", async ({
  page,
}) => {
  const apiPort =
    (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env?.PW_API_PORT || "3000";
  const metadata = await page.request.get(
    `http://localhost:${apiPort}/webtransport/cert-hash`,
  );

  test.skip(!metadata.ok(), "WebTransport test backend is unavailable");

  await page.goto("src/services/webtransport/webtransport-demo.html");

  await page.getByRole("button", { name: "Send" }).click();

  await page.getByText("Hello WebTransport").waitFor();
  await page.getByText("Server stream opened").waitFor();
});
