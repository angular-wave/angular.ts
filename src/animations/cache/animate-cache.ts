/**
 * Internal cache entry used to track animation results and usage.
 */
export interface CacheEntry {
  /**
   * Number of times this cache entry has been accessed or reused.
   */
  total: number;

  /**
   * Cached animation result (typically an animation runner or metadata).
   */
  value: any;

  /**
   * Whether the cached animation is considered valid (e.g. has a duration).
   */
  isValid: boolean;
}

const KEY = "$animId";

/**
 * Animation cache responsible for:
 *  - Generating stable animation cache keys
 *  - Tracking cached animation results
 *  - Avoiding repeated animation work
 *
 * Cache keys are scoped per parent node to prevent collisions between
 * structurally identical nodes in different DOM subtrees.
 *
 * @internal
 */
export class AnimateCache {
  /** @internal */
  _cache: Map<string, CacheEntry> = new Map();

  /**
   * Monotonically increasing counter used to assign synthetic parent IDs.
   * IDs are stored directly on parent nodes under `$animId`.
   *
   */
  /** @internal */
  _parentCounter = 0;

  /**
   * Generates a stable cache key for an animation invocation.
   *
   * The key is derived from:
   *  - The node's parent (used as a cache namespace)
   *  - The animation method (e.g. enter, leave, addClass)
   *  - The node's current CSS class state
   *  - Any classes being added or removed
   *
   * If the node is not attached to the DOM, the node itself is used
   * as the parent scope to avoid key collisions.
   */
  /** @internal */
  _cacheKey(
    node: HTMLElement,
    method: string,
    addClass?: string,
    removeClass?: string,
  ): string {
    const parent = (node.parentNode ?? node) as ParentNode &
      Record<string, number>;

    const parentID = parent[KEY] ?? (parent[KEY] = ++this._parentCounter);

    const parts = [parentID, method, node.getAttribute("class")];

    if (addClass) parts.push(addClass);

    if (removeClass) parts.push(removeClass);

    return parts.join(" ");
  }

  /**
   * Determines whether a cache entry exists but is marked as invalid.
   *
   * This is typically used to detect animations that were previously
   * cached but resolved without a duration.
   */
  /** @internal */
  _containsCachedAnimationWithoutDuration(key: string): boolean {
    const entry = this._cache.get(key);

    return !!entry && !entry.isValid;
  }

  /**
   * Clears all cached animation entries.
   *
   * Does not reset parent IDs.
   */
  /** @internal */
  _flush(): void {
    this._cache.clear();
  }

  /**
   * Returns the number of times a cache entry has been used.
   */
  /** @internal */
  _count(key: string): number {
    return this._cache.get(key)?.total ?? 0;
  }

  /**
   * Retrieves the cached value associated with a cache key.
   */
  /** @internal */
  _get(key: string): CacheEntry["value"] | undefined {
    return this._cache.get(key)?.value;
  }

  /**
   * Inserts or updates a cache entry.
   *
   * Existing entries will have their usage count incremented
   * and their value replaced.
   */
  /** @internal */
  _put(key: string, value: CacheEntry["value"], isValid: boolean): void {
    const entry = this._cache.get(key);

    if (entry) {
      entry.total++;
      entry.value = value;
    } else {
      this._cache.set(key, { total: 1, value, isValid });
    }
  }
}

export const animateCache = new AnimateCache();
