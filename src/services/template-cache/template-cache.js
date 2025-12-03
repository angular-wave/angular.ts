/**
 * Provides an instance of a cache that can be used to store and retrieve template content.
 */
export class TemplateCacheProvider {
  constructor() {
    /** @type {ng.TemplateCacheService} */
    this.cache = new Map();
  }

  /**
   * @returns {ng.TemplateCacheService}
   */
  $get() {
    return this.cache;
  }
}
