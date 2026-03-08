/**
 * A simple bounded FIFO queue with optional eviction notifications.
 * @template T
 */
export declare class Queue<T> {
  _items: T[];
  _limit: number | null;
  _evictListeners: Array<(item: T) => void>;
  /**
   * @param {T[]} [items=[]] - Initial queue items.
   * @param {number|null} [limit=null] - Maximum allowed items before eviction (null = unlimited).
   */
  constructor(items?: T[], limit?: number | null);
  /**
   * Register a listener that will be called with the evicted item.
   * @param {(item: T) => void} listener
   */
  onEvict(listener: (item: T) => void): void;
  /**
   * Adds an item to the end of the queue, evicting the head if over limit.
   * @param {T} item
   * @returns {T}
   */
  enqueue(item: T): T;
  /**
   * Removes the head item and notifies eviction listeners.
   * @returns {T|undefined}
   */
  evict(): T | undefined;
  /**
   * Removes and returns the first item in the queue.
   * @returns {T|undefined}
   */
  dequeue(): T | undefined;
  /**
   * Clears all items from the queue.
   * @returns {T[]} The previously stored items.
   */
  clear(): T[];
  /**
   * Returns the current number of items.
   * @returns {number}
   */
  size(): number;
  /**
   * Removes a specific item from the queue.
   * @param {T} item
   * @returns {T|false} The removed item, or false if not found.
   */
  remove(item: T): T | false;
  /**
   * Returns the item at the tail (last).
   * @returns {T|undefined}
   */
  peekTail(): T | undefined;
  /**
   * Returns the item at the head (first).
   * @returns {T|undefined}
   */
  peekHead(): T | undefined;
}
