import assert from "node:assert/strict";
import test from "node:test";
import { nativeElements } from "../main/ets/generated/NativeElementCatalog.ts";
import { NativeComponentModel } from "../main/ets/components/NativeComponentModel.ts";
import { nativeRenderers } from "../main/ets/components/NativeRendererCatalog.ts";

test("provides an explicit ArkUI renderer for every shared element", () => {
  assert.deepEqual(Object.keys(nativeRenderers).sort(), Object.keys(nativeElements).sort());
  for (const renderer of Object.values(nativeRenderers)) {
    assert.ok(renderer.primitive.length > 0);
  }
});

test("applies catalog defaults and preserves identity across updates", () => {
  const model = new NativeComponentModel("title", "text", "embed-title", () => {});
  assert.deepEqual(model.snapshot(), {
    id: "title",
    name: "text",
    embedId: "embed-title",
    properties: { text: "", textSize: 16, maxLines: 2147483647 },
    visible: false,
    focused: false,
    revision: 0,
  });
  model.update({});
  model.setVisible(false);
  assert.equal(model.snapshot().revision, 0);
  model.update({ text: "Hello" });
  model.setVisible(true);
  assert.equal(model.snapshot().properties.text, "Hello");
  assert.equal(model.snapshot().revision, 2);
});

test("does not synthesize events for methods without a declared event", () => {
  const events = [];
  const contract = { ...nativeElements.text, events: [], methods: [{ name: "show" }] };
  const model = new NativeComponentModel(
    "silent",
    "silent",
    null,
    (event) => events.push(event),
    contract,
  );
  assert.deepEqual(model.invoke("show", {}), { visible: true });
  assert.deepEqual(events, []);
});

test("implements focus and overlay methods with declared events", () => {
  const events = [];
  const field = new NativeComponentModel("field", "text-field", null, (event) => events.push(event));
  assert.deepEqual(field.invoke("focus", {}), { focused: true });
  assert.deepEqual(field.invoke("blur", {}), { focused: false });
  assert.deepEqual(events, ["focus", "blur"]);

  const dialog = new NativeComponentModel("dialog", "dialog", null, (event) => events.push(event));
  assert.deepEqual(dialog.invoke("show", {}), { visible: true });
  assert.deepEqual(dialog.invoke("dismiss", {}), { visible: false });
  assert.deepEqual(events.slice(-2), ["show", "dismiss"]);
});

test("rejects undeclared events and use after disposal", () => {
  const model = new NativeComponentModel("title", "text", null, () => {});
  assert.throws(() => model.emit("click"), (error) => error.code === "unknown_method");
  assert.throws(() => model.emit("command"), (error) => error.code === "unknown_method");
  model.dispose();
  model.dispose();
  assert.throws(() => model.snapshot(), (error) => error.code === "unknown_instance");
});

test("accepts every declared method without emitting private command events", () => {
  for (const [name, contract] of Object.entries(nativeElements)) {
    const events = [];
    const model = new NativeComponentModel(name, name, null, (event) => events.push(event));
    for (const method of contract.methods) {
      assert.doesNotThrow(
        () => model.invoke(method.name, {}),
        `${name}.${method.name} must be callable`,
      );
    }
    assert.ok(events.every((event) => contract.events.some((entry) => entry.name === event)));
  }
});

test("maps drawer visibility methods to its public open and close events", () => {
  const events = [];
  const drawer = new NativeComponentModel("drawer", "drawer", null, (event) => events.push(event));
  drawer.invoke("show", {});
  drawer.invoke("dismiss", {});
  assert.deepEqual(events, ["open", "close"]);
});
