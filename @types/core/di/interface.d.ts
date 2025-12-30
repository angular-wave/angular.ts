import { InjectorService, ProviderInjector } from "./internal-injector.js";
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
  [key: string]: any;
  $provide: {
    provider: Function;
    factory: Function;
    service: Function;
    value: Function;
    constant: Function;
    store: Function;
    decorator: Function;
  };
  $injectorProvider?: {
    $get: () => InjectorService;
  };
  $injector?: ProviderInjector;
}
