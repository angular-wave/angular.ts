import { assign } from "../../shared/utils.ts";

export interface StorageBackend {
  /** Read a stored serialized value. */
  get(key: string): string | undefined;
  /** Store a serialized value. */
  set(key: string, value: string): void;
  /** Remove a stored value. */
  remove(key: string): void;
}

/** Minimal Web Storage-compatible interface used by persistent stores. */
export interface StorageLike {
  /** Read an item by key. */
  getItem(key: string): string | null;
  /** Store an item by key. */
  setItem(key: string, value: string): void;
  /** Remove an item by key. */
  removeItem(key: string): void;
}

/** Configuration for persistent object proxies. */
export interface PersistentStoreConfig {
  /** Backing storage implementation. */
  backend?: StorageLike;
  /** Serialize a value before storage. */
  serialize?: (value: unknown) => string;
  /** Deserialize a stored value. */
  deserialize?: (value: string) => unknown;
  /** Cookie options when cookie storage is used. */
  cookie?: Record<string, unknown>;
}

/** Built-in persistent storage backends understood by `NgModule.store()`. */
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
    assign(target, deserialize(saved));
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
