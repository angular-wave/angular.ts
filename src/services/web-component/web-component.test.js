import { expect, test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("web component unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(
    page,
    "src/services/web-component/web-component.html",
  );
});

test("react demo consumes an AngularTS custom element", async ({ page }) => {
  await page.goto("src/services/web-component/web-component-react-demo.html");

  const card = page.locator("aw-status-card");

  await card.waitFor({ state: "attached" });
  await expect(page.getByRole("status")).toHaveText("React state: 1");
  await expectAngularCard(card, "Consumed by React");
  await expectAngularCard(card, "1");

  await page.getByRole("button", { name: "Increment in React" }).click();

  await expect(page.getByRole("status")).toHaveText("React state: 2");
  await expectAngularCard(card, "2");

  await card.evaluate((element) => {
    element.shadowRoot.querySelector("button").click();
  });

  await expect(page.getByRole("status")).toHaveText("React state: 3");
  await expectAngularCard(card, "3");

  await page.getByLabel("Title").fill("React changed title");
  await expectAngularCard(card, "React changed title");
});

test("microapp demo exposes a standalone AngularTS custom element", async ({
  page,
}) => {
  await page.goto(
    "src/services/web-component/web-component-microapp-demo.html",
  );

  const microapp = page.locator("aw-inventory-microapp");

  await microapp.waitFor({ state: "attached" });
  await expectAngularCard(microapp, "Inventory Microapp");
  await expectAngularCard(microapp, "18 units");

  await microapp.evaluate((element) => {
    element.shadowRoot.querySelector("button").click();
  });

  await expect(page.getByRole("status")).toHaveText("ship: 17 units");
  await expectAngularCard(microapp, "17 units");

  await page.getByRole("button", { name: "Rename from host" }).click();
  await expectAngularCard(microapp, "Host renamed microapp");

  await page.getByRole("button", { name: "Reset from host" }).click();
  await expect(page.getByRole("status")).toHaveText("host-reset: 18 units");
  await expectAngularCard(microapp, "18 units");
});

async function expectAngularCard(card, text) {
  await expect
    .poll(() => card.evaluate((element) => element.shadowRoot.textContent))
    .toContain(text);
}
