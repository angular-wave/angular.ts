/** Public contract implemented by the `$templateCache` injectable. */
export type TemplateCacheService = Map<string, string>;

/** Cache implementation accepted by `$templateCache` configuration. */
export type TemplateCache = TemplateCacheService;

/**
 * Declarative configuration accepted by
 * `NgModule.config({ $templateCache: ... })`.
 */
export interface TemplateCacheConfig {
  /**
   * Cache instance returned by `$templateCache`.
   */
  cache?: TemplateCache;
}
