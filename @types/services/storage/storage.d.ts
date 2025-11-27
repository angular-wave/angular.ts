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
export function createPersistentProxy(
  target: object,
  key: string,
  storage: object,
  options?: {
    serialize?: Function;
    deserialize?: Function;
  },
): ProxyConstructor;
