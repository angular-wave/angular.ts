import { $injectTokens as $t } from "../../injection-tokens.ts";
import {
  filterFilter,
  type FilterFactory,
  type FilterService,
} from "../../filters/filter.ts";
import { jsonFilter } from "../../filters/json.ts";
import { limitToFilter } from "../../filters/limit-to.ts";
import { orderByFilter } from "../../filters/order-by.ts";
import type { Provider } from "../../interface.ts";
import { assert, entries, isDefined, isFunction } from "../../shared/utils.ts";
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
