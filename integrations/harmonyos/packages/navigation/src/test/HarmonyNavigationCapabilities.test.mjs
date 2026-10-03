import assert from "node:assert/strict";
import test from "node:test";

import { HarmonyNavigationCapabilities } from "../main/ets/HarmonyNavigationCapabilities.ts";

test("routes navigation calls without closing the shared navigator", async () => {
  const calls = [];
  const base = {
    call: (...parameters) => calls.push(["call", ...parameters]),
    closeTarget: (target) => calls.push(["close", target]),
  };
  const navigation = {
    invoke: async (...parameters) => ({ parameters }),
  };
  const platform = new HarmonyNavigationCapabilities(base, navigation);
  const context = {};
  const emit = () => undefined;

  assert.deepEqual(
    await platform.call("navigation", "push", { url: "/one" }, context, emit),
    { parameters: ["push", { url: "/one" }] },
  );
  assert.equal(platform.call("clipboard", "read", {}, context, emit), 1);
  platform.closeTarget("navigation");
  platform.closeTarget("clipboard");
  assert.equal(calls[0][0], "call");
  assert.deepEqual(calls[1], ["close", "clipboard"]);
});
