import type { InjectorService, ProviderInjector } from "./internal-injector.ts";
import type {
  Constructor,
  Injectable,
  ProviderDefinition,
  ServiceProvider,
} from "../../interface.ts";
import type { RuntimeFunction } from "../../shared/utils.ts";

type Dynamic = ReturnType<typeof JSON.parse>;

export interface ProviderRegistry {
  provider(name: string, definition: ProviderDefinition): ServiceProvider;
  factory(
    name: string,
    factory: Injectable<(...args: Dynamic[]) => unknown>,
  ): ServiceProvider;
  service(
    name: string,
    constructor:
      | Injectable<Constructor>
      | Injectable<(...args: Dynamic[]) => unknown>,
  ): ServiceProvider;
  value(name: string, value: unknown): ServiceProvider;
  constant(name: string, value: unknown): void;
  store(
    name: string,
    constructor: Constructor | RuntimeFunction,
    type: ng.StorageType,
    config?: StorageLike & PersistentStoreConfig,
  ): ServiceProvider;
  decorator(
    name: string,
    decorator: Injectable<(...args: Dynamic[]) => unknown>,
  ): void;
}

export interface ProviderRegistrationCommand {
  readonly kind: "provider-registration";
  readonly register: (registry: ProviderRegistry) => void;
}

export function providerRegistration(
  register: (registry: ProviderRegistry) => void,
): ProviderRegistrationCommand {
  return { kind: "provider-registration", register };
}

export function isProviderRegistrationCommand(
  value: unknown,
): value is ProviderRegistrationCommand {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "kind") === "provider-registration"
  );
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

export interface ProviderCache {
  [key: string]: unknown; // dynamic providers
  $injectorProvider?: {
    $get: () => InjectorService;
  };
  $injector?: ProviderInjector;
}
