/**
 * Creates a proxy that automatically persists an object's state
 * into a storage backend whenever a property is set.
 *
 * The proxy also restores previously serialized state on creation and
 * persists deletions in addition to property assignments.
 */
export declare function createPersistentProxy<
  T extends Record<PropertyKey, any>,
>(
  target: T,
  key: string,
  storage: import("../../core/di/interface.ts").StorageLike & any,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => Partial<T>;
  },
): T;
