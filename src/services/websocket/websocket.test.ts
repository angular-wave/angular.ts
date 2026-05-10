import { test } from "@playwright/test";
import { expectNoJasmineFailures } from "../../../playwright-jasmine.js";

test("websocket unit tests contain no errors", async ({ page }) => {
  await expectNoJasmineFailures(page, "src/services/websocket/websocket.html");
});
