import { _injector } from "../../injection-tokens.ts";
import type { FilterFactory, FilterService } from "../../filters/filter.ts";
import { validate, validateIsString } from "../../shared/validate.ts";
import type { ProviderRegistry } from "../di/interface.ts";
import { isInjectable } from "../di/injectable.ts";

const SUFFIX = "Filter";

/** @internal */
export class FilterRegistry {
  private readonly _factories = new Map<string, FilterFactory>();
  private readonly _boundFactories = new Map<string, FilterFactory>();
  private _providerRegistry?: ProviderRegistry;
  private _destroyed = false;

  attach(providerRegistry: ProviderRegistry): void {
    this._assertActive();
    this._providerRegistry = providerRegistry;
    this._boundFactories.clear();

    this._factories.forEach((factory, name) => {
      this._bind(name, factory);
    });
  }

  register(name: string, factory: FilterFactory): this {
    this._assertActive();
    validateIsString(name, "name");
    validate(isInjectable, factory, "factory");
    this._factories.set(name, factory);
    this._bind(name, factory);

    return this;
  }

  destroy(): void {
    if (this._destroyed) return;

    this._destroyed = true;
    this._factories.clear();
    this._boundFactories.clear();
    this._providerRegistry = undefined;
  }

  assertActive(): void {
    this._assertActive();
  }

  private _bind(name: string, factory: FilterFactory): void {
    if (!this._providerRegistry) return;
    if (this._boundFactories.get(name) === factory) return;

    this._providerRegistry.factory(name + SUFFIX, factory);
    this._boundFactories.set(name, factory);
  }

  private _assertActive(): void {
    if (this._destroyed) {
      throw new Error("Filter registry has been destroyed");
    }
  }
}

/** @internal */
export function createFilterService(
  registry: FilterRegistry,
  $injector: ng.InjectorService,
): FilterService {
  return (name: string) => {
    registry.assertActive();
    validateIsString(name, "name");

    return $injector.get<ReturnType<FilterService>>(name + SUFFIX);
  };
}

/** @internal */
export function createFilterRegistration(
  registry: FilterRegistry,
): [string, ($injector: ng.InjectorService) => FilterService] {
  return [_injector, ($injector) => createFilterService(registry, $injector)];
}
