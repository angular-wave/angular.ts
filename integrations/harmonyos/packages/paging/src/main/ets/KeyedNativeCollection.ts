export type CollectionMutation<T> =
  | { readonly type: "insert"; readonly index: number; readonly item: T }
  | { readonly type: "remove"; readonly index: number; readonly key: string }
  | { readonly type: "move"; readonly from: number; readonly to: number; readonly key: string }
  | { readonly type: "update"; readonly index: number; readonly item: T }
  | { readonly type: "reset"; readonly items: readonly T[] };

export class KeyedNativeCollection<T> {
  private items: T[] = [];
  private readonly key: (item: T) => string;

  constructor(key: (item: T) => string) {
    this.key = key;
  }

  reconcile(next: readonly T[]): readonly CollectionMutation<T>[] {
    const keys = next.map(this.key);
    if (new Set(keys).size !== keys.length) throw new TypeError("Native collection keys must be unique");
    if (this.items.length === 0) {
      this.items = [...next];
      return next.map((item, index) => ({ type: "insert", index, item }));
    }
    const mutations: CollectionMutation<T>[] = [];
    const working = [...this.items];
    const wanted = new Set(keys);
    for (let index = working.length - 1; index >= 0; index--) {
      const itemKey = this.key(working[index] as T);
      if (!wanted.has(itemKey)) {
        working.splice(index, 1);
        mutations.push({ type: "remove", index, key: itemKey });
      }
    }
    for (let index = 0; index < next.length; index++) {
      const item = next[index] as T;
      const itemKey = this.key(item);
      const current = working.findIndex((candidate) => this.key(candidate) === itemKey);
      if (current < 0) {
        working.splice(index, 0, item);
        mutations.push({ type: "insert", index, item });
      } else {
        if (current !== index) {
          working.splice(current, 1);
          working.splice(index, 0, item);
          mutations.push({ type: "move", from: current, to: index, key: itemKey });
        }
        if (working[index] !== item) {
          working[index] = item;
          mutations.push({ type: "update", index, item });
        }
      }
    }
    this.items = working;
    return mutations;
  }

  snapshot(): readonly T[] {
    return [...this.items];
  }

  reset(items: readonly T[]): CollectionMutation<T> {
    this.items = [...items];
    return { type: "reset", items: this.snapshot() };
  }
}
