import assert from "node:assert/strict";
import test from "node:test";
import { KeyedNativeCollection } from "../main/ets/KeyedNativeCollection.ts";

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function applyMutations(items, mutations) {
  for (const mutation of mutations) {
    if (mutation.type === "insert") items.splice(mutation.index, 0, mutation.item);
    if (mutation.type === "remove") {
      assert.equal(items[mutation.index].id, mutation.key);
      items.splice(mutation.index, 1);
    }
    if (mutation.type === "move") {
      const [item] = items.splice(mutation.from, 1);
      assert.equal(item.id, mutation.key);
      items.splice(mutation.to, 0, item);
    }
    if (mutation.type === "update") items[mutation.index] = mutation.item;
    if (mutation.type === "reset") items.splice(0, items.length, ...mutation.items);
  }
}

test("property-checks keyed mutations against a reference collection", () => {
  const random = randomGenerator(0xc011ec7);
  const collection = new KeyedNativeCollection((item) => item.id);
  const reference = [];
  let revision = 0;

  for (let iteration = 0; iteration < 1_000; iteration += 1) {
    const ids = Array.from({ length: 20 }, (_, index) => `item-${index}`)
      .sort(() => random() - 0.5)
      .slice(0, Math.floor(random() * 21));
    const previous = new Map(collection.snapshot().map((item) => [item.id, item]));
    const next = ids.map((id) => {
      const current = previous.get(id);
      if (current !== undefined && random() > 0.35) return current;
      return { id, value: revision++ };
    });

    const mutations = iteration % 97 === 0
      ? [collection.reset(next)]
      : collection.reconcile(next);
    applyMutations(reference, mutations);
    assert.deepEqual(reference, next);
    assert.deepEqual(collection.snapshot(), next);
    for (const item of next) {
      if (previous.get(item.id) === item) {
        assert.equal(collection.snapshot().find((value) => value.id === item.id), item);
      }
    }
  }

  const before = collection.snapshot();
  assert.throws(
    () => collection.reconcile([{ id: "duplicate" }, { id: "duplicate" }]),
    /unique/u,
  );
  assert.deepEqual(collection.snapshot(), before);
});
