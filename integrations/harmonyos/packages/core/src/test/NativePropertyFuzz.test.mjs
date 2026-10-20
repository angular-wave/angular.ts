import assert from "node:assert/strict";
import test from "node:test";
import {
  NATIVE_BRIDGE_PROTOCOL_VERSION,
  parseNativeBridgeRequest,
  utf8ByteLength,
} from "../main/ets/bridge/NativeBridgeProtocol.ts";
import { nativeLayoutFrame } from "../main/ets/layout/NativeLayout.ts";
import { NativeNodeRegistry } from "../main/ets/nodes/NativeNodeRegistry.ts";

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInteger(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function randomString(random, minimum = 1) {
  const symbols = ["a", "Z", "0", " ", "é", "€", "😀", "\uD800"];
  const length = randomInteger(random, minimum, 20);
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += symbols[randomInteger(random, 0, symbols.length - 1)];
  }
  return value;
}

test("property-checks UTF-8 accounting and randomized bridge envelopes", () => {
  const random = randomGenerator(0x5eed1234);
  for (let index = 0; index < 1_000; index += 1) {
    const text = randomString(random, 0);
    assert.equal(utf8ByteLength(text), Buffer.byteLength(text, "utf8"));

    const request = {
      protocol: NATIVE_BRIDGE_PROTOCOL_VERSION,
      id: `request-${index}`,
      target: randomString(random).trim() || "platform",
      method: randomString(random).trim() || "status",
      params: {
        count: randomInteger(random, -1_000, 1_000),
        enabled: random() > 0.5,
        label: randomString(random, 0),
      },
      session: random() > 0.5 ? `session-${index}` : undefined,
    };
    const result = parseNativeBridgeRequest(JSON.stringify(request));
    assert.equal(result.ok, true);
    assert.deepEqual(result.request, {
      id: request.id,
      target: request.target,
      method: request.method,
      params: request.params,
      session: request.session ?? null,
    });

    const invalid = { ...request };
    const mutation = index % 6;
    if (mutation === 0) invalid.protocol = randomInteger(random, 2, 100);
    if (mutation === 1) invalid.id = " ";
    if (mutation === 2) invalid.target = "";
    if (mutation === 3) invalid.method = " ";
    if (mutation === 4) invalid.params = ["not", "an", "object"];
    if (mutation === 5) invalid.session = "";
    assert.equal(parseNativeBridgeRequest(JSON.stringify(invalid)).ok, false);
  }
});

test("property-checks randomized layout conversion without accumulated rounding", () => {
  const random = randomGenerator(0x1a70cafe);
  for (let index = 0; index < 1_000; index += 1) {
    const density = 0.25 + random() * 7.75;
    const source = {
      x: random() * 8_000 - 4_000,
      y: random() * 8_000 - 4_000,
      width: random() * 4_000 - 1_000,
      height: random() * 4_000 - 1_000,
    };
    const environment = {
      density,
      viewportOffsetX: random() * 1_000 - 500,
      viewportOffsetY: random() * 1_000 - 500,
      safeAreaTop: random() * 300,
      safeAreaEnd: random() * 300,
      safeAreaBottom: random() * 300,
      safeAreaStart: random() * 300,
      rightToLeft: random() > 0.5,
    };
    const frame = nativeLayoutFrame(source, environment);
    assert.equal(frame.x, (source.x - environment.viewportOffsetX) / density);
    assert.equal(frame.y, (source.y - environment.viewportOffsetY) / density);
    assert.equal(frame.width, Math.max(0, source.width / density));
    assert.equal(frame.height, Math.max(0, source.height / density));
    assert.equal(frame.safeArea.top, environment.safeAreaTop / density);
    assert.equal(frame.safeArea.end, environment.safeAreaEnd / density);
    assert.equal(frame.safeArea.bottom, environment.safeAreaBottom / density);
    assert.equal(frame.safeArea.start, environment.safeAreaStart / density);
    assert.equal(frame.rightToLeft, environment.rightToLeft);
  }
});

function registryFixture() {
  const frames = [];
  const nodes = new Map();
  const disposed = [];
  const adapter = {
    beginBatch() {},
    endBatch() {},
    create(id, name) {
      const node = { id, name, updates: 0 };
      nodes.set(id, node);
      return node;
    },
    update(node) {
      node.updates += 1;
    },
    layout() {},
    setVisible() {},
    invoke(node, method) {
      return `${node.id}:${method}`;
    },
    dispose(node) {
      disposed.push(node);
      nodes.delete(node.id);
    },
  };
  const registry = new NativeNodeRegistry(
    adapter,
    { schedule: (callback) => frames.push(callback) },
    () => {},
  );
  const context = (requestId) => {
    const cancellation = [];
    return {
      requestId,
      cancelled: false,
      onCancel: (callback) => cancellation.push(callback),
      cancel() {
        this.cancelled = true;
        for (const callback of cancellation) callback();
      },
    };
  };
  const settle = async (operation) => {
    frames.shift()?.();
    return operation;
  };
  return { context, disposed, nodes, registry, settle };
}

test("fuzzes node lifecycle ordering while preserving live identity", async () => {
  const random = randomGenerator(0xc10ced42);
  const fixture = registryFixture();
  const live = new Map();
  let nextId = 0;

  for (let index = 0; index < 400; index += 1) {
    const ids = [...live.keys()];
    const operation = ids.length === 0 ? 0 : randomInteger(random, 0, 4);
    if (operation === 0) {
      const id = `node-${nextId++}`;
      const context = fixture.context(`mount-${index}`);
      const pending = fixture.registry.invoke(
        "mount",
        { id, name: "text", props: { text: id } },
        context,
      );
      if (index % 19 === 0) {
        context.cancel();
        await assert.rejects(fixture.settle(pending), (error) => error.code === "cancelled");
      } else {
        await fixture.settle(pending);
        live.set(id, fixture.nodes.get(id));
      }
      continue;
    }

    const id = ids[randomInteger(random, 0, ids.length - 1)];
    const identity = live.get(id);
    if (operation <= 2) {
      const pending = fixture.registry.invoke(
        "update",
        { id, props: { text: `${id}-${index}` } },
        fixture.context(`update-${index}`),
      );
      await fixture.settle(pending);
      assert.equal(fixture.nodes.get(id), identity);
    } else if (operation === 3) {
      const pending = fixture.registry.invoke(
        "invoke",
        { id, method: "focus", args: {} },
        fixture.context(`invoke-${index}`),
      );
      assert.deepEqual(await fixture.settle(pending), { id, result: `${id}:focus` });
      assert.equal(fixture.nodes.get(id), identity);
    } else {
      const pending = fixture.registry.invoke(
        "unmount",
        { id },
        fixture.context(`unmount-${index}`),
      );
      await fixture.settle(pending);
      live.delete(id);
      assert.equal(fixture.nodes.has(id), false);
    }
  }

  const remaining = [...live.values()];
  fixture.registry.close();
  assert.equal(fixture.nodes.size, 0);
  assert.ok(remaining.every((node) => fixture.disposed.includes(node)));
  assert.throws(
    () => fixture.registry.invoke("mount", { id: "late", name: "text" }, fixture.context("late")),
    (error) => error.code === "interrupted",
  );
});
