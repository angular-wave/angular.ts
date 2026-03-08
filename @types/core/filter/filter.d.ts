import type { FilterFactory, FilterService } from "../../filters/interface.ts";
import type { Provider } from "../../interface.ts";
/**
 * $filterProvider - $filter - provider in module ng
 */
export declare class FilterProvider {
  static $inject: "$provide"[];
  _$provide: Provider;
  $get: [string, ($injector: ng.InjectorService) => FilterService];
  /**
   * Registers the built-in filters and exposes the `$filter` service factory.
   */
  constructor($provide: Provider);
  /**
   * Registers a filter factory under the provided public filter name.
   */
  register(name: string, factory: FilterFactory): FilterProvider;
}
