import { $injectTokens as $t } from "../../injection-tokens.js";
import { isObject } from "../../shared/utils.js";
import { filterFilter } from "../../filters/filter.js";
import { jsonFilter } from "../../filters/filters.js";
import { limitToFilter } from "../../filters/limit-to.js";
import { orderByFilter } from "../../filters/order-by.js";
import {
  $IncludedByStateFilter,
  $IsStateFilter,
} from "../../router/state-filters.js";

const SUFFIX = "Filter";

export class FilterProvider {
  /* @ignore */ static $inject = [$t.$provide];

  /**
   * @param {ng.ProvideService} $provide
   */
  constructor($provide) {
    this.$provide = $provide;
    this.register({
      filter: filterFilter,
      json: jsonFilter,
      limitTo: limitToFilter,
      orderBy: orderByFilter,
      isState: $IsStateFilter,
      includedByState: $IncludedByStateFilter,
    });
  }

  /**
   * @param {string|Record<string, ng.FilterFn>} name
   * @param {ng.FilterService} [factory]
   * @return {import('../../interface.ts').Provider}
   */
  register(name, factory) {
    if (isObject(name)) {
      const filters = {};
      Object.entries(name).forEach(([key, filter]) => {
        filters[key] = this.register(key, filter);
      });
    }
    return this.$provide.factory(name + SUFFIX, factory);
  }

  $get = [
    $t.$injector,
    /**
     * @param {import("../../core/di/internal-injector.js").InjectorService} $injector
     * @returns {ng.FilterService}
     */
    ($injector) => (/** @type {string} */ name) => $injector.get(name + SUFFIX),
  ];
}
