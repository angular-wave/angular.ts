/**
 * A simple bounded FIFO queue with optional eviction notifications.
 * @template T
 */
export class Queue {
  /**
   * @param {T[]} [items=[]] - Initial queue items.
   * @param {number|null} [limit=null] - Maximum allowed items before eviction (null = unlimited).
   */
  constructor(items = [], limit = null) {
    /** @type {T[]} */
    this._items = Array.isArray(items) ? [...items] : [];

    /** @type {number|null} */
    this._limit = Number.isInteger(limit) && limit > 0 ? limit : null;

    /** @type {Array<(item: T) => void>} */
    this._evictListeners = [];
  }

  /**
   * Register a listener that will be called with the evicted item.
   * @param {(item: T) => void} listener
   */
  onEvict(listener) {
    this._evictListeners.push(listener);
  }

  /**
   * Adds an item to the end of the queue, evicting the head if over limit.
   * @param {T} item
   * @returns {T}
   */
  enqueue(item) {
    this._items.push(item);

    if (this._limit !== null && this._items.length > this._limit) {
      this.evict();
    }

    return item;
  }

  /**
   * Removes the head item and notifies eviction listeners.
   * @returns {T|undefined}
   */
  evict() {
    const item = this._items.shift();

    if (item !== undefined) {
      this._evictListeners.forEach((fn) => fn(item));
    }

    return item;
  }

  /**
   * Removes and returns the first item in the queue.
   * @returns {T|undefined}
   */
  dequeue() {
    return this._items.length > 0 ? this._items.shift() : undefined;
  }

  /**
   * Clears all items from the queue.
   * @returns {T[]} The previously stored items.
   */
  clear() {
    const cleared = [...this._items];

    this._items.length = 0;

    return cleared;
  }

  /**
   * Returns the current number of items.
   * @returns {number}
   */
  size() {
    return this._items.length;
  }

  /**
   * Removes a specific item from the queue.
   * @param {T} item
   * @returns {T|false} The removed item, or false if not found.
   */
  remove(item) {
    const index = this._items.indexOf(item);

    return index !== -1 ? this._items.splice(index, 1)[0] : false;
  }

  /**
   * Returns the item at the tail (last).
   * @returns {T|undefined}
   */
  peekTail() {
    return this._items[this._items.length - 1];
  }

  /**
   * Returns the item at the head (first).
   * @returns {T|undefined}
   */
  peekHead() {
    return this._items[0];
  }
}
