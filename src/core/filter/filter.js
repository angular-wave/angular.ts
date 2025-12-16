import { $injectTokens as $t } from "../../injection-tokens.js";
import { filterFilter } from "../../filters/filter.js";
import { jsonFilter } from "../../filters/filters.js";
import { limitToFilter } from "../../filters/limit-to.js";
import { orderByFilter } from "../../filters/order-by.js";
import { assert, entries, isDefined, isFunction } from "../../shared/utils.js";
import { validate, validateIsString } from "../../shared/validate.js";

/* @ignore */
const SUFFIX = "Filter";

/**
 * $filterProvider - $filter - provider in module ng
 *
 * Filters are just functions which transform input to an output. However filters need to be Dependency Injected. To achieve this a filter definition consists of a factory function which is annotated with dependencies and is responsible for creating a filter function.
 * @extends {ng.ServiceProvider}
 */
export class FilterProvider {
  /* @ignore */ static $inject = [$t._provide];

  /**
   * @param {ng.ProvideService} $provide
   */
  constructor($provide) {
    assert(isDefined($provide));
    this._$provide = $provide;
    entries({
      filter: filterFilter,
      json: jsonFilter,
      limitTo: limitToFilter,
      orderBy: orderByFilter,
    }).forEach(([k, v]) =>
      this.register(k, /** @type {ng.FilterFactory} */ (v)),
    );
  }

  /**
   * Register a filter a config phase;
   * @param {string} name
   * @param {ng.FilterFactory} factory
   * @return {ng.FilterProvider}
   */
  register(name, factory) {
    validateIsString(name, "name");
    validate(isFunction, factory, "factory");
    this._$provide.factory(name + SUFFIX, factory);

    return this;
  }

  $get = [
    $t._injector,
    /**
     * @param {ng.InjectorService} $injector
     * @returns {ng.FilterService}
     */
    ($injector) => (name) => {
      validateIsString(name, "name");

      return $injector.get(name + SUFFIX);
    },
  ];
}
