import { expect, test } from "@playwright/test";
import { withPageCoverage } from "../../playwright-jasmine.js";

for (const mode of ["html5", "hash"]) {
  test(`location and router preserve navigation, history, and cancellation in ${mode} mode`, async ({
    page,
  }) => {
    await withPageCoverage(page, `location-router-${mode}`, async () => {
      await page.goto(`/src/router/location-compatibility.html?mode=${mode}`);
      await expect(page.getByRole("heading")).toHaveText("Home");
      const initialHistoryLength = await page.evaluate(() => history.length);
      const item = page.getByRole("link", { name: "Open item", exact: true });
      await expect(item).toHaveAttribute(
        "href",
        `${mode === "hash" ? "#~" : ""}/items/42?tag=first&tag=second`,
      );
      await item.click();
      await expect(page.getByRole("heading")).toHaveText("Item 42");
      await expect(page).toHaveURL(/\/items\/42\?tag=first&tag=second$/);
      expect(await page.evaluate(() => history.length)).toBe(
        initialHistoryLength + 1,
      );

      await page.goBack();
      await expect(page.getByRole("heading")).toHaveText("Home");
      await page.goForward();
      await expect(page.getByRole("heading")).toHaveText("Item 42");
      expect(await page.evaluate(() => history.length)).toBe(
        initialHistoryLength + 1,
      );

      if (mode === "html5") {
        await page.getByRole("button", { name: "Save state" }).click();
        await expect
          .poll(() => page.evaluate(() => history.state))
          .toEqual({ page: 2 });
      }

      const currentUrl = page.url();
      await page.getByRole("button", { name: "Toggle block" }).click();
      await page
        .getByRole("link", { name: "Native item", exact: true })
        .click();
      await expect(page).toHaveURL(currentUrl);
      await expect(page.getByRole("heading")).toHaveText("Item 42");
      await page.getByRole("button", { name: "Toggle block" }).click();
      await page
        .getByRole("link", { name: "Native item", exact: true })
        .click();
      await expect(page.getByRole("heading")).toHaveText("Item 7");
      await expect(page).toHaveURL(/\/items\/7\?tag=native$/);
      const beforeBlockedUrl = page.url();
      const beforeBlockedHistory = await page.evaluate(() => history.length);
      await page
        .getByRole("link", { name: "Blocked item", exact: true })
        .click();
      await expect(page.getByTestId("router-blocks")).toHaveText("1");
      await expect(page).toHaveURL(beforeBlockedUrl);
      await expect(page.getByRole("heading")).toHaveText("Item 7");
      expect(await page.evaluate(() => history.length)).toBe(
        beforeBlockedHistory + 1,
      );
      const beforeReplace = await page.evaluate(() => history.length);
      await page.getByRole("button", { name: "Replace", exact: true }).click();
      await expect(page.getByRole("heading")).toHaveText("Item replacement");
      await expect(page).toHaveURL(/\/items\/replacement\?tag=replaced$/);
      expect(await page.evaluate(() => history.length)).toBe(beforeReplace);
      await page.getByRole("button", { name: "Redirect", exact: true }).click();
      await expect(page.getByRole("heading")).toHaveText("Item redirected");
      await expect(page).toHaveURL(/\/items\/redirected\?tag=after$/);
    });
  });
}
