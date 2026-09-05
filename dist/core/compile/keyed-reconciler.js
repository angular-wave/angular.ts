/**
 * Validates keys and stages every new value before returning a mutation plan.
 * Existing state remains untouched when keying or creation fails.
 *
 * @internal
 */
function planKeyedReconciliation(items, previous, keyOf, indexOf, create) {
    const keys = new Array(items.length);
    const seen = new Set();
    for (let index = 0; index < items.length; index++) {
        const key = keyOf(items[index]);
        if (seen.has(key)) {
            throw new TypeError(`Duplicate programmatic view key '${String(key)}'.`);
        }
        seen.add(key);
        keys[index] = key;
    }
    const entries = new Array(items.length);
    const previousIndexes = new Array(items.length);
    for (let index = 0; index < items.length; index++) {
        const value = items[index];
        const state = previous.get(keys[index]);
        const previousIndex = state ? indexOf(state) : -1;
        entries[index] = state
            ? {
                kind: "reused",
                key: keys[index],
                value,
                previous: state,
                previousIndex,
            }
            : {
                kind: "created",
                key: keys[index],
                value,
                created: create(value),
                previousIndex,
            };
        previousIndexes[index] = previousIndex;
    }
    const removed = [];
    for (const [key, state] of previous) {
        if (!seen.has(key))
            removed.push(state);
    }
    return {
        entries,
        removed,
        stable: findStableKeyedIndexes(previousIndexes),
    };
}
/** @internal */
function findStableKeyedIndexes(previousIndexes) {
    const tails = [];
    const predecessors = new Int32Array(previousIndexes.length);
    predecessors.fill(-1);
    for (let index = 0; index < previousIndexes.length; index++) {
        const previousIndex = previousIndexes[index];
        if (previousIndex < 0)
            continue;
        let low = 0;
        let high = tails.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (previousIndexes[tails[middle]] < previousIndex) {
                low = middle + 1;
            }
            else {
                high = middle;
            }
        }
        if (low > 0)
            predecessors[index] = tails[low - 1];
        tails[low] = index;
    }
    const stable = new Uint8Array(previousIndexes.length);
    let index = tails.length > 0 ? tails[tails.length - 1] : -1;
    while (index >= 0) {
        stable[index] = 1;
        index = predecessors[index];
    }
    return stable;
}

export { findStableKeyedIndexes, planKeyedReconciliation };
