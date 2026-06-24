import { expect, test } from "@playwright/test";

test("Scala.js basic app renders an AngularTS component", async ({ page }) => {
  await page.goto("integrations/scala/examples/basic_app/index.html");

  await expect(page.getByTestId("scala-greeting")).toHaveText(
    "Interpolated Hello from Scala.js",
  );
  await expect(page.getByTestId("scala-bound")).toHaveText(
    "Bound attribute from Scala.js",
  );
  await expect(page.getByTestId("scala-directive")).toHaveAttribute(
    "data-scala-linked",
    "true",
  );
  await expect(page.getByTestId("scala-panel")).toHaveText(
    "App component from Scala.js",
  );
  await expect(page.getByTestId("scala-native-card")).toHaveText(
    "Native ScopeElement from Scala.js",
  );
});
