/**
 * Provides an instance of a cache that can be used to store and retrieve template content.
 */
export declare class TemplateCacheProvider {
  cache: ng.TemplateCacheService;
  constructor();
  /**
   * @returns {ng.TemplateCacheService}
   */
  $get(): ng.TemplateCacheService;
}
