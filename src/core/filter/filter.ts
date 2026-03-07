import { $injectTokens as $t } from "../../injection-tokens.js";
import { filterFilter } from "../../filters/filter.js";
import type { FilterFactory, FilterService } from "../../filters/interface.ts";
import { jsonFilter } from "../../filters/json.js";
import { limitToFilter } from "../../filters/limit-to.js";
import { orderByFilter } from "../../filters/order-by.js";
import type { Provider } from "../../interface.ts";
import { assert, entries, isDefined, isFunction } from "../../shared/utils.js";
import { validate, validateIsString } from "../../shared/validate.ts";

const SUFFIX = "Filter";

export class FilterProvider {
  static $inject = [$t._provide];

  _$provide: Provider;
  $get: [string, ($injector: ng.InjectorService) => FilterService];

  constructor($provide: Provider) {
    assert(isDefined($provide));
    this._$provide = $provide;

    entries({
      filter: filterFilter,
      json: jsonFilter,
      limitTo: limitToFilter,
      orderBy: orderByFilter,
    }).forEach(([key, value]) => {
      this.register(key, value as FilterFactory);
    });

    this.$get = [
      $t._injector,
      ($injector) => (name: string) => {
        validateIsString(name, "name");
        return $injector.get(name + SUFFIX) as ReturnType<FilterService>;
      },
    ];
  }

  register(name: string, factory: FilterFactory): FilterProvider {
    validateIsString(name, "name");
    validate(isFunction, factory, "factory");
    this._$provide.factory(name + SUFFIX, factory);

    return this;
  }
}
