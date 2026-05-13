import { InjectorService, ProviderInjector } from "./internal-injector.ts";

type ProviderMethod = (...args: never[]) => unknown;

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

export interface ProviderCache {
  [key: string]: unknown; // dynamic providers
  $provide: {
    provider: ProviderMethod;
    factory: ProviderMethod;
    service: ProviderMethod;
    value: ProviderMethod;
    constant: ProviderMethod;
    store: ProviderMethod;
    decorator: ProviderMethod;
  };
  $injectorProvider?: {
    $get: () => InjectorService;
  };
  $injector?: ProviderInjector;
}
