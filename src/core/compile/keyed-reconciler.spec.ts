/// <reference types="jasmine" />
import { planKeyedReconciliation } from "./keyed-reconciler.ts";

interface Item {
  readonly id: number;
  readonly label: string;
}

interface State {
  readonly id: number;
  readonly node: object;
  index: number;
}

describe("keyed reconciler", () => {
  it("matches a deterministic randomized sequence model", () => {
    let seed = 0x5eed1234;
    let nextId = 8;
    let items: Item[] = Array.from({ length: 8 }, (_, id) => ({
      id,
      label: `item-${id}`,
    }));
    let states = new Map<PropertyKey, State>(
      items.map((item, index) => [item.id, { id: item.id, node: {}, index }]),
    );

    const random = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };

    for (let step = 0; step < 1_000; step++) {
      const operation = Math.floor(random() * 7);

      if (operation === 0 || items.length === 0) {
        const id = nextId++;
        items.splice(Math.floor(random() * (items.length + 1)), 0, {
          id,
          label: `item-${id}`,
        });
      } else if (operation === 1) {
        items.splice(Math.floor(random() * items.length), 1);
      } else if (operation === 2) {
        const left = Math.floor(random() * items.length);
        const right = Math.floor(random() * items.length);
        [items[left], items[right]] = [items[right], items[left]];
      } else if (operation === 3) {
        items.reverse();
      } else if (operation === 4) {
        const index = Math.floor(random() * items.length);
        items[index] = { ...items[index], label: `changed-${step}` };
      } else if (operation === 5) {
        const id = nextId++;
        items[Math.floor(random() * items.length)] = {
          id,
          label: `item-${id}`,
        };
      } else {
        items = items.slice().sort(() => random() - 0.5);
      }

      const oldNodes = new Map(
        Array.from(states, ([key, state]) => [key, state.node]),
      );
      const plan = planKeyedReconciliation(
        items,
        states,
        (item) => item.id,
        (state) => state.index,
        (item) => ({ id: item.id, node: {}, index: -1 }),
      );
      const next = new Map<PropertyKey, State>();

      plan.entries.forEach((entry, index) => {
        const state = entry.kind === "reused" ? entry.previous : entry.created;

        state.index = index;
        next.set(entry.key, state);

        const previousNode = oldNodes.get(entry.key);

        if (previousNode) {
          expect(state.node).withContext(`step ${step}`).toBe(previousNode);
        }
      });

      expect(Array.from(next.keys()))
        .withContext(`step ${step}`)
        .toEqual(items.map((item) => item.id));
      expect(plan.removed.map((state) => state.id).sort((a, b) => a - b))
        .withContext(`step ${step}`)
        .toEqual(
          Array.from(oldNodes.keys())
            .filter((key) => !next.has(key))
            .map(Number)
            .sort((a, b) => a - b),
        );

      states = next;
    }
  });

  it("does not create or mutate state when key validation fails", () => {
    const state: State = { id: 1, node: {}, index: 0 };
    const states = new Map<PropertyKey, State>([[1, state]]);
    const create = jasmine.createSpy("create");

    expect(() =>
      planKeyedReconciliation(
        [
          { id: 2, label: "first" },
          { id: 2, label: "duplicate" },
        ],
        states,
        (item) => item.id,
        (value) => value.index,
        create,
      ),
    ).toThrowError("Duplicate programmatic view key '2'.");
    expect(create).not.toHaveBeenCalled();
    expect(states.get(1)).toBe(state);
  });

  it("leaves previous state unchanged when creation fails", () => {
    const state: State = { id: 1, node: {}, index: 0 };
    const states = new Map<PropertyKey, State>([[1, state]]);

    expect(() =>
      planKeyedReconciliation(
        [
          { id: 1, label: "retained" },
          { id: 2, label: "fails" },
        ],
        states,
        (item) => item.id,
        (value) => value.index,
        () => {
          throw new Error("create failed");
        },
      ),
    ).toThrowError("create failed");
    expect(states.size).toBe(1);
    expect(states.get(1)).toBe(state);
    expect(state.index).toBe(0);
  });
});
