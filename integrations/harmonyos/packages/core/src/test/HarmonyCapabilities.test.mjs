import assert from "node:assert/strict";
import test from "node:test";
import { nativeCapabilities } from "../main/ets/generated/NativeCapabilityCatalog.ts";
import { createHarmonyCapabilityHandlers } from "../main/ets/capabilities/HarmonyCapabilities.ts";

test("creates a provider for every shared capability", async () => {
  const calls = [];
  const events = [];
  const handlers = createHarmonyCapabilityHandlers({
    call(target, method, parameters, _context, emit) {
      calls.push([target, method, parameters]);
      emit("change", { ready: true });
      return "result";
    },
  }, (...event) => events.push(event));
  assert.deepEqual(Object.keys(handlers).sort(), Object.keys(nativeCapabilities).sort());
  const context = { requestId: "one", cancelled: false, onCancel() {} };
  assert.equal(await handlers.platform.invoke("status", null, context), "result");
  assert.deepEqual(calls, [["platform", "status", {}]]);
  assert.deepEqual(events, [["platform", "change", { ready: true }]]);
});

test("stops provider events and closes each target", () => {
  const closed = [];
  let emit;
  const handlers = createHarmonyCapabilityHandlers({
    call(_target, _method, _parameters, _context, eventSink) { emit = eventSink; },
    closeTarget: (target) => closed.push(target),
  }, () => assert.fail("closed handler emitted"));
  const context = { requestId: "one", cancelled: false, onCancel() {} };
  handlers.lifecycle.invoke("watch", null, context);
  handlers.lifecycle.close();
  emit("change", {});
  assert.deepEqual(closed, ["lifecycle"]);
});
