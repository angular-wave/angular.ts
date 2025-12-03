/**
 * Creates a proxy that automatically persists an object's state
 * into a storage backend whenever a property is set.
 *
 * @param {object} target - The object to wrap
 * @param {string} key - The storage key
 * @param {object} storage - Any storage-like object with getItem/setItem/removeItem
 * @param {{serialize?: function, deserialize?: function}} [options] - Optional custom (de)serialization
 * @returns {Proxy}
 */
export function createPersistentProxy(target, key, storage, options = {}) {
  const serialize = options.serialize || JSON.stringify;

  const deserialize = options.deserialize || JSON.parse;

  // Restore saved state
  const saved = storage.getItem(key);

  if (saved) {
    Object.assign(target, deserialize(saved));
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
