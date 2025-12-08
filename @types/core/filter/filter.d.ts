/**
 * $filterProvider - $filter - provider in module ng
 *
 * Filters are just functions which transform input to an output. However filters need to be Dependency Injected. To achieve this a filter definition consists of a factory function which is annotated with dependencies and is responsible for creating a filter function.
 * @extends {ng.ServiceProvider}
 */
export class FilterProvider {
  static $inject: string[];
  /**
   * @param {ng.ProvideService} $provide
   */
  constructor($provide: ng.ProvideService);
  _$provide: import("../../interface.ts").Provider;
  /**
   * Register a filter a config phase;
   * @param {string} name
   * @param {ng.FilterFactory} factory
   * @return {ng.FilterProvider}
   */
  register(name: string, factory: ng.FilterFactory): ng.FilterProvider;
  $get: (string | (($injector: ng.InjectorService) => ng.FilterService))[];
}
