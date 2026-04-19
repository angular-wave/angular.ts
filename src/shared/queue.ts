import { isArray } from "./utils.ts";

/**
 * A simple bounded FIFO queue with optional eviction notifications.
 * @template T
 */
export class Queue<T> {
  /** @internal */
  _items: T[];
  /** @internal */
  _limit: number | null;
  /** @internal */
  _evictListeners: Array<(item: T) => void>;

  /**
   * @param [items=[]] - Initial queue items.
   * @param [limit=null] - Maximum allowed items before eviction (null = unlimited).
   */
  constructor(items: T[] = [], limit: number | null = null) {
    this._items = isArray(items) ? [...items] : [];

    this._limit =
      Number.isInteger(limit) && limit !== null && limit > 0 ? limit : null;

    this._evictListeners = [];
  }

  /**
   * Register a listener that will be called with the evicted item.
   */
  /** @internal */
  _onEvict(listener: (item: T) => void): void {
    this._evictListeners.push(listener);
  }

  /**
   * Adds an item to the end of the queue, evicting the head if over limit.
   */
  /** @internal */
  _enqueue(item: T): T {
    this._items.push(item);

    if (this._limit !== null && this._items.length > this._limit) {
      this._evict();
    }

    return item;
  }

  /**
   * Removes the head item and notifies eviction listeners.
   */
  /** @internal */
  _evict(): T | undefined {
    const item = this._items.shift();

    if (item !== undefined) {
      this._evictListeners.forEach((fn) => fn(item));
    }

    return item;
  }

  /**
   * Removes and returns the first item in the queue.
   */
  /** @internal */
  _dequeue(): T | undefined {
    return this._items.length > 0 ? this._items.shift() : undefined;
  }

  /**
   * Clears all items from the queue.
   * @returns The previously stored items.
   */
  /** @internal */
  _clear(): T[] {
    const cleared = [...this._items];

    this._items.length = 0;

    return cleared;
  }

  /**
   * Returns the current number of items.
   */
  /** @internal */
  _size(): number {
    return this._items.length;
  }

  /**
   * Removes a specific item from the queue.
   * @returns The removed item, or false if not found.
   */
  /** @internal */
  _remove(item: T): T | false {
    const index = this._items.indexOf(item);

    return index !== -1 ? this._items.splice(index, 1)[0] : false;
  }

  /**
   * Returns the item at the tail (last).
   */
  /** @internal */
  _peekTail(): T | undefined {
    return this._items[this._items.length - 1];
  }

  /**
   * Returns the item at the head (first).
   */
  /** @internal */
  _peekHead(): T | undefined {
    return this._items[0];
  }
}
