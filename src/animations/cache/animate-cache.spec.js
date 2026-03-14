import { AnimateCache } from "./animate-cache.js";

describe("AnimateCache", () => {
  let cache;
  let node;
  let parent;

  beforeEach(() => {
    cache = new AnimateCache();

    parent = document.createElement("div");
    node = document.createElement("span");

    parent.appendChild(node);
    node.className = "foo bar";
  });

  describe("_cacheKey()", () => {
    it("generates a deterministic key for the same inputs", () => {
      const key1 = cache._cacheKey(node, "enter");
      const key2 = cache._cacheKey(node, "enter");

      expect(key1).toBe(key2);
    });

    it("scopes keys by parent node", () => {
      const otherParent = document.createElement("div");
      const otherNode = document.createElement("span");

      otherParent.appendChild(otherNode);
      otherNode.className = "foo bar";

      const key1 = cache._cacheKey(node, "enter");
      const key2 = cache._cacheKey(otherNode, "enter");

      expect(key1).not.toBe(key2);
    });

    it("includes addClass and removeClass when provided", () => {
      const key = cache._cacheKey(node, "addClass", "active", "disabled");

      expect(key).toContain("addClass");
      expect(key).toContain("active");
      expect(key).toContain("disabled");
    });

    it("uses the node itself when parentNode is null", () => {
      const detached = document.createElement("div");
      detached.className = "detached";

      const key = cache._cacheKey(detached, "enter");

      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });

  describe("_put(), _get(), _count()", () => {
    it("stores and retrieves a cached value", () => {
      cache._put("key", 123, true);

      expect(cache._get("key")).toBe(123);
    });

    it("increments usage count on repeated puts", () => {
      cache._put("key", "a", true);
      cache._put("key", "b", true);

      expect(cache._count("key")).toBe(2);
      expect(cache._get("key")).toBe("b");
    });

    it("returns 0 count for missing entries", () => {
      expect(cache._count("missing")).toBe(0);
    });
  });

  describe("_containsCachedAnimationWithoutDuration()", () => {
    it("returns true when an entry exists but is invalid", () => {
      cache._put("key", {}, false);

      expect(cache._containsCachedAnimationWithoutDuration("key")).toBe(true);
    });

    it("returns false when entry is valid", () => {
      cache._put("key", {}, true);

      expect(cache._containsCachedAnimationWithoutDuration("key")).toBe(false);
    });

    it("returns false when entry does not exist", () => {
      expect(cache._containsCachedAnimationWithoutDuration("missing")).toBe(
        false,
      );
    });
  });

  describe("_flush()", () => {
    it("clears all cache entries", () => {
      cache._put("key1", 1, true);
      cache._put("key2", 2, false);

      cache._flush();

      expect(cache._count("key1")).toBe(0);
      expect(cache._get("key2")).toBeUndefined();
    });
  });
});
