export function animateCache(): {
  /**
   * Generates a unique cache key based on the node's parent and other parameters.
   * @param {HTMLElement} node - The DOM node to generate the cache key for.
   * @param {string} method - The animation method being applied.
   * @param {string} [addClass] - Class to add during the animation.
   * @param {string} [removeClass] - Class to remove during the animation.
   * @returns {string} - The generated cache key.
   */
  cacheKey(
    node: HTMLElement,
    method: string,
    addClass?: string,
    removeClass?: string,
  ): string;
  /**
   * Checks if a cached animation without a duration exists.
   * @param {string} key - The cache key to check.
   * @returns {boolean} - True if an invalid animation is cached, false otherwise.
   */
  containsCachedAnimationWithoutDuration(key: string): boolean;
  /**
   * Clears the cache.
   * @returns {void}
   */
  flush(): void;
  /**
   * Gets the count of a specific cache entry.
   * @param {string} key - The cache key to count.
   * @returns {number} - The count of the cache entry.
   */
  count(key: string): number;
  /**
   * Retrieves a value associated with a specific cache key.
   * @param {string} key - The cache key to retrieve.
   * @returns {any} - The value associated with the cache key.
   */
  get(key: string): any;
  /**
   * Adds or updates a cache entry.
   * @param {string} key - The cache key to add or update.
   * @param {any} value - The value to store.
   * @param {boolean} isValid - Whether the cache entry is valid.
   */
  put(key: string, value: any, isValid: boolean): void;
};
export class AnimateCacheProvider {
  $get(): {
    /**
     * Generates a unique cache key based on the node's parent and other parameters.
     * @param {HTMLElement} node - The DOM node to generate the cache key for.
     * @param {string} method - The animation method being applied.
     * @param {string} [addClass] - Class to add during the animation.
     * @param {string} [removeClass] - Class to remove during the animation.
     * @returns {string} - The generated cache key.
     */
    cacheKey(
      node: HTMLElement,
      method: string,
      addClass?: string,
      removeClass?: string,
    ): string;
    /**
     * Checks if a cached animation without a duration exists.
     * @param {string} key - The cache key to check.
     * @returns {boolean} - True if an invalid animation is cached, false otherwise.
     */
    containsCachedAnimationWithoutDuration(key: string): boolean;
    /**
     * Clears the cache.
     * @returns {void}
     */
    flush(): void;
    /**
     * Gets the count of a specific cache entry.
     * @param {string} key - The cache key to count.
     * @returns {number} - The count of the cache entry.
     */
    count(key: string): number;
    /**
     * Retrieves a value associated with a specific cache key.
     * @param {string} key - The cache key to retrieve.
     * @returns {any} - The value associated with the cache key.
     */
    get(key: string): any;
    /**
     * Adds or updates a cache entry.
     * @param {string} key - The cache key to add or update.
     * @param {any} value - The value to store.
     * @param {boolean} isValid - Whether the cache entry is valid.
     */
    put(key: string, value: any, isValid: boolean): void;
  };
}
