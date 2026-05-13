import { _injector, _provide } from "../../injection-tokens.ts";
import type { FilterFactory, FilterService } from "../../filters/filter.ts";
import { isFunction } from "../../shared/utils.ts";
import { validate, validateIsString } from "../../shared/validate.ts";

const SUFFIX = "Filter";

export class FilterProvider {
  static $inject = [_provide];

  /** @internal */
  _$provide: ng.ProvideService;
  $get: [string, ($injector: ng.InjectorService) => FilterService];

  constructor($provide: ng.ProvideService) {
    this._$provide = $provide;

    this.$get = [
      _injector,
      ($injector) => (name: string) => {
        validateIsString(name, "name");

        return $injector.get(name + SUFFIX) as ReturnType<FilterService>;
      },
    ];
  }

  register(name: string, factory: FilterFactory): this {
    validateIsString(name, "name");
    validate(isFunction, factory, "factory");
    this._$provide.factory(name + SUFFIX, factory);

    return this;
  }
}
