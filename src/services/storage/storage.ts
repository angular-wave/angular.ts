export interface StorageBackend {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistentStoreConfig {
  backend?: StorageLike;
  serialize?: (value: unknown) => string;
  deserialize?: (value: string) => unknown;
  cookie?: Record<string, unknown>;
}

export type StorageType = "local" | "session" | "cookie" | "custom";

/**
 * Creates a proxy that automatically persists an object's state
 * into a storage backend whenever a property is set.
 *
 * The proxy also restores previously serialized state on creation and
 * persists deletions in addition to property assignments.
 */
export function createPersistentProxy<T extends Record<PropertyKey, any>>(
  target: T,
  key: string,
  storage: StorageLike & any,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => Partial<T>;
  } = {},
): T {
  const serialize = options.serialize || JSON.stringify;

  const deserialize = options.deserialize || JSON.parse;

  // Restore saved state
  const saved = storage.getItem(key);

  if (saved) {
    Object.assign(target, deserialize(saved));
  }

  return new Proxy(target, {
    set(obj, prop, value): boolean {
      (obj as Record<PropertyKey, any>)[prop] = value;
      storage.setItem(key, serialize(obj));

      return true;
    },
    deleteProperty(obj, prop): boolean {
      const deleted = delete obj[prop];

      storage.setItem(key, serialize(obj));

      return deleted;
    },
  });
}
