import { $injectTokens as $t } from "../../injection-tokens.js";
import { filterFilter } from "../../filters/filter.js";
import { jsonFilter } from "../../filters/filters.js";
import { limitToFilter } from "../../filters/limit-to.js";
import { orderByFilter } from "../../filters/order-by.js";
import {
  $IncludedByStateFilter,
  $IsStateFilter,
} from "../../router/state-filters.js";
import {
  assert,
  BADARG,
  isDefined,
  isFunction,
  isString,
} from "../../shared/utils.js";

const SUFFIX = "Filter";

/**
 * $filterProvider - $filter - provider in module ng
 *
 * Filters are just functions which transform input to an output. However filters need to be Dependency Injected. To achieve this a filter definition consists of a factory function which is annotated with dependencies and is responsible for creating a filter function.
 * @extends {ng.ServiceProvider}
 */
export class FilterProvider {
  /* @ignore */ static $inject = [$t.$provide];

  /**
   * @param {ng.ProvideService} $provide
   */
  constructor($provide) {
    assert(isDefined($provide));
    this.$provide = $provide;
    Object.entries({
      filter: filterFilter,
      json: jsonFilter,
      limitTo: limitToFilter,
      orderBy: orderByFilter,
      isState: $IsStateFilter,
      includedByState: $IncludedByStateFilter,
    }).forEach(([k, v]) => this.register(k, v));
  }

  /**
   * Register a filter a config phase;
   * @param {string} name
   * @param {ng.Injectable<ng.FilterFactory>} factory
   * @return {ng.FilterProvider}
   */
  register(name, factory) {
    assert(isString(name), BADARG + `:name ${name}`);
    assert(
      isFunction(factory) || Array.isArray(factory),
      BADARG + `:factory ${factory}`,
    );
    this.$provide.factory(name + SUFFIX, factory);
    return this;
  }

  $get = [
    $t.$injector,
    /**
     * @param {ng.InjectorService} $injector
     * @returns {ng.FilterFactory}
     */
    ($injector) => (name) => {
      assert(isString(name), BADARG + `:name ${name}`);
      return $injector.get(name + SUFFIX);
    },
  ];
}
