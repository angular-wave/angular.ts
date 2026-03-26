import { Queue } from "./queue.js";

describe("Queue", () => {
  let queue;

  beforeEach(() => {
    queue = new Queue();
  });

  it("should enqueue items", () => {
    queue._enqueue("a");
    queue._enqueue("b");
    expect(queue._size()).toBe(2);
    expect(queue._peekHead()).toBe("a");
    expect(queue._peekTail()).toBe("b");
  });

  it("should dequeue items", () => {
    queue._enqueue("x");
    queue._enqueue("y");
    const item = queue._dequeue();
    expect(item).toBe("x");
    expect(queue._size()).toBe(1);
    expect(queue._peekHead()).toBe("y");
  });

  it("should evict when over limit", () => {
    const evicted = [];
    queue = new Queue([], 2);
    queue._onEvict((item) => evicted.push(item));
    queue._enqueue("1");
    queue._enqueue("2");
    queue._enqueue("3"); // should evict "1"
    expect(queue._size()).toBe(2);
    expect(evicted).toEqual(["1"]);
    expect(queue._peekHead()).toBe("2");
  });

  it("should remove specific items", () => {
    queue._enqueue("a");
    queue._enqueue("b");
    queue._enqueue("c");
    const removed = queue._remove("b");
    expect(removed).toBe("b");
    expect(queue._size()).toBe(2);
    expect(queue._items).toEqual(["a", "c"]);
  });

  it("should clear the queue", () => {
    queue._enqueue("foo");
    queue._enqueue("bar");
    const cleared = queue._clear();
    expect(cleared).toEqual(["foo", "bar"]);
    expect(queue._size()).toBe(0);
  });

  it("should peek at head and tail", () => {
    queue._enqueue("first");
    queue._enqueue("last");
    expect(queue._peekHead()).toBe("first");
    expect(queue._peekTail()).toBe("last");
  });

  it("should return undefined when dequeueing from empty queue", () => {
    expect(queue._dequeue()).toBeUndefined();
  });

  it("should return undefined when peeking head in empty queue", () => {
    expect(queue._peekHead()).toBeUndefined();
  });

  it("should not evict if limit is not reached", () => {
    const evicted = [];
    queue = new Queue([], 3);
    queue._onEvict((item) => evicted.push(item));
    queue._enqueue("1");
    queue._enqueue("2");
    expect(evicted.length).toBe(0);
  });
});
