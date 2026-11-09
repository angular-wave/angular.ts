import { expect, test, type Page } from "@playwright/test";
import type { dealoc } from "../../shared/dom.ts";

interface OpenModel {
  menuOpen: boolean;
  secondOpen: boolean;
  manualOpen: boolean;
  detailsOpen: boolean;
  dialogOpen: boolean;
  modalOpen: boolean;
  popoverDialogOpen: boolean;
  overrideOpen: boolean;
}

declare global {
  interface Window {
    openFixture: {
      scope: ng.Scope & { vm: OpenModel };
      compile: ng.CompileService;
      dealoc: typeof dealoc;
      errors: string[];
    };
  }
}

async function setOpen(page: Page, property: keyof OpenModel, value: boolean) {
  await page.evaluate(
    ({ property, value }) => {
      window.openFixture.scope.vm[property] = value;
    },
    { property, value },
  );
}

async function getOpen(page: Page, property: keyof OpenModel) {
  return page.evaluate((property) => {
    return window.openFixture.scope.vm[property];
  }, property);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/src/directive/open/open.html");
  await page.waitForFunction(() => "openFixture" in window);
});

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => window.openFixture.errors)).toEqual([]);
});

test("scope drives native popover visibility without an open attribute", async ({
  page,
}) => {
  await page.locator("#toggle-menu").click();
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#menu")).not.toHaveAttribute("open");
  await setOpen(page, "menuOpen", false);
  await expect(page.locator("#menu")).toBeHidden();
});

test("native invokers update the model in both directions", async ({
  page,
}) => {
  await page.locator("#native-menu").click();
  await expect.poll(() => getOpen(page, "menuOpen")).toBe(true);
  await page.locator("#native-menu").click();
  await expect.poll(() => getOpen(page, "menuOpen")).toBe(false);
});

test("Escape and click-outside dismissal update application state", async ({
  page,
}) => {
  await setOpen(page, "menuOpen", true);
  await expect(page.locator("#menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.poll(() => getOpen(page, "menuOpen")).toBe(false);
  await setOpen(page, "menuOpen", true);
  await expect(page.locator("#menu")).toBeVisible();
  await page.locator("#outside").click();
  await expect.poll(() => getOpen(page, "menuOpen")).toBe(false);
});

test("native auto-popover exclusivity is reflected into both models", async ({
  page,
}) => {
  await setOpen(page, "menuOpen", true);
  await expect(page.locator("#menu")).toBeVisible();
  await setOpen(page, "secondOpen", true);
  await expect(page.locator("#second-menu")).toBeVisible();
  await expect.poll(() => getOpen(page, "menuOpen")).toBe(false);
  expect(await getOpen(page, "secondOpen")).toBe(true);
});

test("manual popover mode retains native non-dismissal behavior", async ({
  page,
}) => {
  await setOpen(page, "manualOpen", true);
  await expect(page.locator("#manual-menu")).toBeVisible();
  await page.locator("#outside").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#manual-menu")).toBeVisible();
  expect(await getOpen(page, "manualOpen")).toBe(true);
});

test("prevented opening reconciles the model even without a toggle event", async ({
  page,
}) => {
  await page.locator("#menu").evaluate((element) => {
    element.addEventListener(
      "beforetoggle",
      (event) => event.preventDefault(),
      { once: true },
    );
  });
  await setOpen(page, "menuOpen", true);
  await expect.poll(() => getOpen(page, "menuOpen")).toBe(false);
  await expect(page.locator("#menu")).toBeHidden();
});

test("summary clicks and scope writes share details state", async ({
  page,
}) => {
  await page.locator("#details summary").click();
  await expect.poll(() => getOpen(page, "detailsOpen")).toBe(true);
  await setOpen(page, "detailsOpen", false);
  await expect(page.locator("#details")).not.toHaveAttribute("open");
  await page.locator("#details summary").click();
  await expect.poll(() => getOpen(page, "detailsOpen")).toBe(true);
  await page.locator("#details summary").click();
  await expect.poll(() => getOpen(page, "detailsOpen")).toBe(false);
});

test("legacy computed details expressions remain supported", async ({
  page,
}) => {
  await expect(page.locator("#computed-details")).toHaveAttribute("open", "");
  await page.locator("#computed-details summary").click();
  await expect(page.locator("#computed-details")).not.toHaveAttribute("open");
});

test("dialogs remain non-modal unless data-modal is present", async ({
  page,
}) => {
  await setOpen(page, "dialogOpen", true);
  await expect(page.locator("#dialog")).toBeVisible();
  expect(
    await page
      .locator("#dialog")
      .evaluate((element) => element.matches(":modal")),
  ).toBe(false);
  await page
    .locator("#dialog")
    .evaluate((element) => (element as HTMLDialogElement).close());
  await expect.poll(() => getOpen(page, "dialogOpen")).toBe(false);
});

test("native modal form submission closes and synchronizes state", async ({
  page,
}) => {
  await setOpen(page, "modalOpen", true);
  await expect(page.locator("#modal")).toBeVisible();
  expect(
    await page
      .locator("#modal")
      .evaluate((element) => element.matches(":modal")),
  ).toBe(true);
  await page.locator("#accept").click();
  await expect.poll(() => getOpen(page, "modalOpen")).toBe(false);
  await expect(page.locator("#modal form")).toHaveClass(/ng-submitted/);
  expect(
    await page
      .locator("#modal")
      .evaluate((element) => (element as HTMLDialogElement).returnValue),
  ).toBe("accepted");
});

test("submit-button formmethod overrides retain native dialog closing", async ({
  page,
}) => {
  await setOpen(page, "overrideOpen", true);
  await expect(page.locator("#override-modal")).toBeVisible();
  await page.locator("#override-accept").click();
  await expect.poll(() => getOpen(page, "overrideOpen")).toBe(false);
  await expect(page.locator("#override-modal form")).toHaveClass(
    /ng-submitted/,
  );
  expect(
    await page
      .locator("#override-modal")
      .evaluate((element) => (element as HTMLDialogElement).returnValue),
  ).toBe("override");
});

test("prevented modal cancellation does not clear state", async ({ page }) => {
  await setOpen(page, "modalOpen", true);
  await expect(page.locator("#modal")).toBeVisible();
  await page.locator("#modal").evaluate((element) => {
    element.addEventListener("cancel", (event) => event.preventDefault(), {
      once: true,
    });
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).toBeVisible();
  expect(await getOpen(page, "modalOpen")).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => getOpen(page, "modalOpen")).toBe(false);
});

test("queued close events cannot undo a later reopen", async ({ page }) => {
  await setOpen(page, "modalOpen", true);
  await expect(page.locator("#modal")).toBeVisible();
  await page.locator("#modal").evaluate((element) => {
    const dialog = element as HTMLDialogElement;
    dialog.close();
    dialog.showModal();
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(await getOpen(page, "modalOpen")).toBe(true);
  await expect(page.locator("#modal")).toBeVisible();
});

test("dialog popovers use popover behavior rather than showModal", async ({
  page,
}) => {
  await setOpen(page, "popoverDialogOpen", true);
  await expect(page.locator("#popover-dialog")).toBeVisible();
  expect(
    await page
      .locator("#popover-dialog")
      .evaluate((element) => element.matches(":modal")),
  ).toBe(false);
  await page.keyboard.press("Escape");
  await expect.poll(() => getOpen(page, "popoverDialogOpen")).toBe(false);
});

test("destroying an owner closes overlays without writing back into dead state", async ({
  page,
}) => {
  await setOpen(page, "menuOpen", true);
  await expect(page.locator("#menu")).toBeVisible();
  await page.evaluate(() => window.openFixture.scope.destroy());
  await expect(page.locator("#menu")).toBeHidden();
  expect(await getOpen(page, "menuOpen")).toBe(true);
});

test("popovers reject non-assignable expressions", async ({ page }) => {
  const errors = await page.evaluate(() => {
    const fixture = window.openFixture;
    const element = fixture.compile('<div popover ng-open="true"></div>')(
      fixture.scope,
    );
    const errors = fixture.errors.splice(0);
    if (element instanceof Element) fixture.dealoc(element);
    else throw new Error("Expected the compiled popover to be an element");
    return errors;
  });
  expect(errors.some((error) => error.includes("nonassign"))).toBe(true);
});
