import assert from "node:assert/strict";
import test from "node:test";
import { NativeBridgeDispatcher } from "../main/ets/bridge/NativeBridgeDispatcher.ts";
import { NativeBridgeSecurity } from "../main/ets/bridge/NativeBridgeSecurity.ts";

test("preserves stable failures emitted by optional capability packages", async () => {
  const replies = [];
  const dispatcher = new NativeBridgeDispatcher(
    new NativeBridgeSecurity("https://example.test/app", "session"),
    {
      credentials: {
        invoke() {
          throw Object.assign(new Error("Passkeys are unavailable"), { code: "unavailable" });
        },
      },
    },
    (reply) => replies.push(reply),
  );
  dispatcher.receive(JSON.stringify({
    protocol: 1,
    id: "request-1",
    session: "session",
    target: "credentials",
    method: "status",
    params: {},
  }), "https://example.test/page");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(replies, [{
    protocol: 1,
    id: "request-1",
    ok: false,
    error: { code: "unavailable", message: "Passkeys are unavailable" },
  }]);
});
