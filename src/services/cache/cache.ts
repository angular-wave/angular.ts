/** Cache read strategies shared by HTTP, REST, and router transports. */
export type CacheStrategy =
  | "cache-first"
  | "network-first"
  | "stale-while-revalidate";

/** Synchronous or asynchronous cache store. */
export interface CacheStore<T = unknown> {
  get(key: string): T | undefined | PromiseLike<T | undefined>;
  set(key: string, value: T): void | PromiseLike<void>;
  delete(key: string): void | PromiseLike<void>;
  deletePrefix?(prefix: string): void | PromiseLike<void>;
}

export interface CacheExecutionResult<T> {
  value: T;
  source: "cache" | "network";
  stale: boolean;
}

export interface CacheExecutionOptions<T> {
  strategy: CacheStrategy;
  store: CacheStore<T>;
  key: string;
  load(): Promise<T>;
  onRevalidate?(value: T): void;
}

/** Returns whether a runtime value is a supported cache strategy. */
export function isCacheStrategy(value: unknown): value is CacheStrategy {
  return (
    value === "cache-first" ||
    value === "network-first" ||
    value === "stale-while-revalidate"
  );
}

async function loadAndStore<T>(options: CacheExecutionOptions<T>): Promise<T> {
  const value = await options.load();

  await options.store.set(options.key, value);

  return value;
}

/** Executes one cache policy without coupling it to a transport or storage API. */
export async function executeCacheStrategy<T>(
  options: CacheExecutionOptions<T>,
): Promise<CacheExecutionResult<T>> {
  switch (options.strategy) {
    case "cache-first": {
      const cached = await options.store.get(options.key);

      return cached === undefined
        ? {
            value: await loadAndStore(options),
            source: "network",
            stale: false,
          }
        : { value: cached, source: "cache", stale: false };
    }
    case "network-first":
      try {
        return {
          value: await loadAndStore(options),
          source: "network",
          stale: false,
        };
      } catch (error) {
        const cached = await options.store.get(options.key);

        if (cached !== undefined) {
          return { value: cached, source: "cache", stale: true };
        }

        throw error;
      }
    case "stale-while-revalidate": {
      const cached = await options.store.get(options.key);

      if (cached === undefined) {
        return {
          value: await loadAndStore(options),
          source: "network",
          stale: false,
        };
      }

      void loadAndStore(options).then(
        (value) => {
          options.onRevalidate?.(value);
          return undefined;
        },
        () => undefined,
      );

      return { value: cached, source: "cache", stale: true };
    }
  }
}
