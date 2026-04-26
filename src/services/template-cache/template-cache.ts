/** Cache implementation used by the `$templateCache` service. */
export type TemplateCache = Map<string, string>;

/**
 * Provides an instance of a cache that can be used to store and retrieve template content.
 */
export class TemplateCacheProvider {
  cache: TemplateCache;

  /**
   * Creates the in-memory template cache backing store.
   */
  constructor() {
    this.cache = new Map();
  }

  /**
   * Returns the singleton template cache instance.
   */
  $get(): TemplateCache {
    return this.cache;
  }
}
