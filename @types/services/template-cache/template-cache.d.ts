/**
 * Provides an instance of a cache that can be used to store and retrieve template content.
 */
export declare class TemplateCacheProvider {
  cache: ng.TemplateCacheService;
  /**
   * Creates the in-memory template cache backing store.
   */
  constructor();
  /**
   * Returns the singleton template cache instance.
   */
  $get(): ng.TemplateCacheService;
}
