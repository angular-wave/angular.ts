import { assign } from '../../shared/utils.js';

/**
 * Creates a proxy that automatically persists an object's state
 * into a storage backend whenever a property is set.
 *
 * The proxy also restores previously serialized state on creation and
 * persists deletions in addition to property assignments.
 */
function createPersistentProxy(target, key, storage, options = {}) {
    const serialize = options.serialize || JSON.stringify;
    const deserialize = options.deserialize || JSON.parse;
    // Restore saved state
    const saved = storage.getItem(key);
    if (saved) {
        assign(target, deserialize(saved));
    }
    return new Proxy(target, {
        set(obj, prop, value) {
            obj[prop] = value;
            storage.setItem(key, serialize(obj));
            return true;
        },
        deleteProperty(obj, prop) {
            const deleted = delete obj[prop];
            storage.setItem(key, serialize(obj));
            return deleted;
        },
    });
}

export { createPersistentProxy };
