const KEY = "$animId";

let parentCounter = 0;

const cache = new Map();

export function animateCache() {
  return {
    /**
     * Generates a unique cache key based on the node's parent and other parameters.
     * @param {HTMLElement} node - The DOM node to generate the cache key for.
     * @param {string} method - The animation method being applied.
     * @param {string} [addClass] - Class to add during the animation.
     * @param {string} [removeClass] - Class to remove during the animation.
     * @returns {string} - The generated cache key.
     */
    cacheKey(node, method, addClass, removeClass) {
      const { parentNode } = node;

      const parentID = parentNode[KEY] ?? (parentNode[KEY] = ++parentCounter);

      const parts = [parentID, method, node.getAttribute("class")];

      if (addClass) parts.push(addClass);

      if (removeClass) parts.push(removeClass);

      return parts.join(" ");
    },

    /**
     * Checks if a cached animation without a duration exists.
     * @param {string} key - The cache key to check.
     * @returns {boolean} - True if an invalid animation is cached, false otherwise.
     */
    containsCachedAnimationWithoutDuration(key) {
      const entry = cache.get(key);

      return entry ? !entry.isValid : false;
    },

    /**
     * Clears the cache.
     * @returns {void}
     */
    flush() {
      cache.clear();
    },

    /**
     * Gets the count of a specific cache entry.
     * @param {string} key - The cache key to count.
     * @returns {number} - The count of the cache entry.
     */
    count(key) {
      return cache.get(key)?.total ?? 0;
    },

    /**
     * Retrieves a value associated with a specific cache key.
     * @param {string} key - The cache key to retrieve.
     * @returns {any} - The value associated with the cache key.
     */
    get(key) {
      return cache.get(key)?.value;
    },

    /**
     * Adds or updates a cache entry.
     * @param {string} key - The cache key to add or update.
     * @param {any} value - The value to store.
     * @param {boolean} isValid - Whether the cache entry is valid.
     */
    put(key, value, isValid) {
      const entry = cache.get(key);

      if (entry) {
        entry.total++;
        entry.value = value;
      } else {
        cache.set(key, { total: 1, value, isValid });
      }
    },
  };
}

export class AnimateCacheProvider {
  $get() {
    return animateCache();
  }
}
