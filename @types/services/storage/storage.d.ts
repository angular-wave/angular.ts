/**
 * Creates a proxy that automatically persists an object's state
 * into a storage backend whenever a property is set.
 *
 * @param {Record<PropertyKey, any>} target - The object to wrap
 * @param {string} key - The storage key
 * @param {import("../../core/di/interface.ts").StorageLike & import("../../core/di/interface").PersistentStoreConfig} storage - Any storage-like object with getItem/setItem/removeItem
 * @param {{serialize?: function, deserialize?: function}} [options] - Optional custom (de)serialization
 * @returns {Record<PropertyKey, any>}
 */
export function createPersistentProxy(
  target: Record<PropertyKey, any>,
  key: string,
  storage: import("../../core/di/interface.ts").StorageLike & any,
  options?: {
    serialize?: Function;
    deserialize?: Function;
  },
): Record<PropertyKey, any>;
