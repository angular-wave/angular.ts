export interface StorageBackend {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}
