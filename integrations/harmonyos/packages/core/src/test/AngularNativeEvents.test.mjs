import assert from "node:assert/strict";
import test from "node:test";
import { AngularNativeWebHost } from "../main/ets/web/AngularNativeWebHost.ts";

test("queues native events until the page receives its environment", async () => {
  const scripts = [];
  const runtime = {
    currentLocation: "https://example.test/app",
    runJavaScript: async (source) => scripts.push(source),
  };
  const host = new AngularNativeWebHost(
    "https://example.test/app",
    runtime,
    {},
    "session",
  );
  host.emitEvent("component", "change", { id: "field", value: "Ada" });
  assert.deepEqual(scripts, []);
  await host.pageReady();
  assert.equal(scripts.length, 2);
  assert.match(scripts[1], /"target":"component","event":"change"/u);
  host.emitEvent("window", "change", { width: 320 });
  assert.equal(scripts.length, 3);
  host.close();
  host.emitEvent("window", "change", {});
  assert.equal(scripts.length, 3);
});
