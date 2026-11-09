import type { InjectorService, ProviderInjector } from "./internal-injector.ts";
import type {
  Constructor,
  Injectable,
  InjectionTokenMap,
  ProviderDefinition,
  ServiceProvider,
} from "../../interface.ts";
import type { RuntimeFunction } from "../../shared/utils.ts";

type Dynamic = ReturnType<typeof JSON.parse>;

type RegisteredValue<Name extends string> = Name extends keyof InjectionTokenMap
  ? InjectionTokenMap[Name]
  : unknown;

type DependencyValues<Dependencies extends readonly string[]> = {
  -readonly [Index in keyof Dependencies]: Dependencies[Index] extends keyof InjectionTokenMap
    ? InjectionTokenMap[Dependencies[Index]]
    : Dynamic;
};

type RegisteredFactory<
  Name extends string,
  Dependencies extends readonly string[],
> =
  | ((...args: Dynamic[]) => RegisteredValue<NoInfer<Name>>)
  | [
      ...Dependencies,
      NoInfer<
        (
          ...args: DependencyValues<Dependencies>
        ) => RegisteredValue<NoInfer<Name>>
      >,
    ];

type RegisteredService<
  Name extends string,
  Dependencies extends readonly string[],
> =
  | RegisteredFactory<Name, Dependencies>
  | (new (...args: Dynamic[]) => RegisteredValue<NoInfer<Name>>)
  | [
      ...Dependencies,
      NoInfer<
        new (
          ...args: DependencyValues<Dependencies>
        ) => RegisteredValue<NoInfer<Name>>
      >,
    ];

export interface ProviderRegistry {
  provider(name: string, definition: ProviderDefinition): ServiceProvider;
  /** Checks built-in results and dependency tuples; custom tokens remain supported. */
  factory<
    const Name extends string,
    const Dependencies extends readonly string[],
  >(
    name: Name,
    factory: RegisteredFactory<NoInfer<Name>, Dependencies>,
  ): ServiceProvider;
  /** Checks constructed built-in instances and explicitly annotated dependencies. */
  service<
    const Name extends string,
    const Dependencies extends readonly string[],
  >(
    name: Name,
    constructor: RegisteredService<NoInfer<Name>, Dependencies>,
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
    get: () => InjectorService;
  };
  $injector?: ProviderInjector;
}
