/**
 * Provides an instance of a cache that can be used to store and retrieve template content.
 */
export class TemplateCacheProvider {
  cache: ng.TemplateCacheService;

  constructor() {
    this.cache = new Map();
  }

  /**
   * @returns {ng.TemplateCacheService}
   */
  $get(): ng.TemplateCacheService {
    return this.cache;
  }
}
