import assert from "node:assert/strict";
import test from "node:test";
import { KeyedNativeCollection } from "../main/ets/KeyedNativeCollection.ts";

test("emits incremental keyed collection mutations", () => {
  const collection = new KeyedNativeCollection((item) => item.id);
  const one = { id: "one", value: 1 };
  const two = { id: "two", value: 2 };
  assert.deepEqual(collection.reconcile([one, two]).map((value) => value.type), ["insert", "insert"]);
  const updated = { id: "one", value: 3 };
  assert.deepEqual(collection.reconcile([two, updated]), [
    { type: "move", from: 1, to: 0, key: "two" },
    { type: "update", index: 1, item: updated },
  ]);
  assert.equal(collection.snapshot()[0], two);
  assert.equal(collection.snapshot()[1], updated);
});

test("rejects duplicate stable keys", () => {
  const collection = new KeyedNativeCollection((item) => item.id);
  assert.throws(() => collection.reconcile([{ id: "same" }, { id: "same" }]), /unique/u);
});
