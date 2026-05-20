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
    element.shadowRoot!.querySelector("button")!.click();
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
    element.shadowRoot!.querySelector("button")!.click();
  });

  await expect(page.getByRole("status")).toHaveText("ship: 17 units");
  await expectAngularCard(microapp, "17 units");

  await page.getByRole("button", { name: "Rename from host" }).click();
  await expectAngularCard(microapp, "Host renamed microapp");

  await page.getByRole("button", { name: "Reset from host" }).click();
  await expect(page.getByRole("status")).toHaveText("host-reset: 18 units");
  await expectAngularCard(microapp, "18 units");
});

test("ScopeElement demo exposes a user-authored custom element", async ({
  page,
}) => {
  await page.goto("src/services/web-component/scope-element-demo.html");

  const game = page.locator("tic-board");

  await game.waitFor({ state: "attached" });
  await expect(page.getByRole("status")).toHaveText("Next player: X");
  await expectAngularCard(game, "AngularTS Tic Tac Toe");
  await expectAngularCard(game, "Next player: X");

  await clickSquare(game, 0);
  await expect(page.getByRole("status")).toHaveText("Next player: O");
  await expectSquare(game, 0, "X");
  await expectAngularCard(game, "Go to move #1");

  await clickSquare(game, 3);
  await expectSquare(game, 3, "O");
  await clickSquare(game, 1);
  await expectSquare(game, 1, "X");
  await clickSquare(game, 4);
  await expectSquare(game, 4, "O");
  await clickSquare(game, 2);
  await expectSquare(game, 2, "X");

  await expect(page.getByRole("status")).toHaveText("Winner: X");
  await expectAngularCard(game, "Winner: X");

  await game.evaluate((element) => {
    element
      .shadowRoot!.querySelectorAll("ol button")[2]
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(page.getByRole("status")).toHaveText("Next player: X");
  await expectAngularCard(game, "Next player: X");
  await expectSquare(game, 0, "X");
  await expectSquare(game, 1, "");
  await expectSquare(game, 3, "O");

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("status")).toHaveText("Next player: X");
  await expectAngularCard(game, "Go to game start");
  await expectSquare(game, 0, "");
});

async function clickSquare(card: any, index: number) {
  await card.evaluate((element: any, squareIndex: number) => {
    const square =
      element.shadowRoot!.querySelectorAll("tic-square")[squareIndex];

    square.shadowRoot.querySelector("button").click();
  }, index);
}

async function expectSquare(card: any, index: number, text: string) {
  await expect
    .poll(() =>
      card.evaluate((element: any, squareIndex: number) => {
        const square =
          element.shadowRoot!.querySelectorAll("tic-square")[squareIndex];

        return square.shadowRoot.querySelector("button").textContent.trim();
      }, index),
    )
    .toBe(text);
}

async function expectAngularCard(card: any, text: any) {
  await expect
    .poll(() => card.evaluate((element: any) => element.shadowRoot.textContent))
    .toContain(text);
}
