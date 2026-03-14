import { Queue } from "./queue.js";

describe("Queue", () => {
  let queue;

  beforeEach(() => {
    queue = new Queue();
  });

  it("should enqueue items", () => {
    queue.enqueue("a");
    queue.enqueue("b");
    expect(queue.size()).toBe(2);
    expect(queue.peekHead()).toBe("a");
    expect(queue.peekTail()).toBe("b");
  });

  it("should dequeue items", () => {
    queue.enqueue("x");
    queue.enqueue("y");
    const item = queue.dequeue();
    expect(item).toBe("x");
    expect(queue.size()).toBe(1);
    expect(queue.peekHead()).toBe("y");
  });

  it("should evict when over limit", () => {
    const evicted = [];
    queue = new Queue([], 2);
    queue.onEvict((item) => evicted.push(item));
    queue.enqueue("1");
    queue.enqueue("2");
    queue.enqueue("3"); // should evict "1"
    expect(queue.size()).toBe(2);
    expect(evicted).toEqual(["1"]);
    expect(queue.peekHead()).toBe("2");
  });

  it("should remove specific items", () => {
    queue.enqueue("a");
    queue.enqueue("b");
    queue.enqueue("c");
    const removed = queue.remove("b");
    expect(removed).toBe("b");
    expect(queue.size()).toBe(2);
    expect(queue._items).toEqual(["a", "c"]);
  });

  it("should clear the queue", () => {
    queue.enqueue("foo");
    queue.enqueue("bar");
    const cleared = queue.clear();
    expect(cleared).toEqual(["foo", "bar"]);
    expect(queue.size()).toBe(0);
  });

  it("should peek at head and tail", () => {
    queue.enqueue("first");
    queue.enqueue("last");
    expect(queue.peekHead()).toBe("first");
    expect(queue.peekTail()).toBe("last");
  });

  it("should return undefined when dequeueing from empty queue", () => {
    expect(queue.dequeue()).toBeUndefined();
  });

  it("should return undefined when peeking head in empty queue", () => {
    expect(queue.peekHead()).toBeUndefined();
  });

  it("should not evict if limit is not reached", () => {
    const evicted = [];
    queue = new Queue([], 3);
    queue.onEvict((item) => evicted.push(item));
    queue.enqueue("1");
    queue.enqueue("2");
    expect(evicted.length).toBe(0);
  });
});
