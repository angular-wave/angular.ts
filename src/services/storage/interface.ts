export interface StorageBackend {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export type StorageType = "local" | "session" | "cookie" | "custom";
