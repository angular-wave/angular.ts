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
