/// <reference types="jasmine" />
import {
  animatedomInsert,
  Cache,
  cloneTranscludedHostElements,
  createElementFromHTML,
  createNodelistFromHTML,
  deleteCacheData,
  domInsert,
  emptyElement,
  extractElementNode,
  getBlockNodes,
  getCacheData,
  getDirectiveHostElement,
  getNormalizedAttr,
  getNormalizedAttrName,
  getOrSetCacheData,
  getTranscludedHostElement,
  hasNormalizedAttr,
  removeElement,
  removeElementData,
  setCacheData,
  setNormalizedAttr,
  setTranscludedHostElement,
  startingTag,
} from "./dom.ts";

describe("dom", () => {
  describe("cache data", () => {
    beforeEach(() => {
      Cache.clear();
    });

    it("stores, reads, deletes, and clears expando-backed data", () => {
      const element = document.createElement("div");

      expect(Cache.size).toBe(0);
      expect(getCacheData(element, "missing")).toBeUndefined();

      setCacheData(element, "foo-bar", 1);

      expect(Cache.size).toBe(1);
      expect(getCacheData(element, "foo-bar")).toBe(1);

      removeElementData(element, "fooBar");

      expect(getCacheData(element, "foo-bar")).toBeUndefined();
      expect(Cache.size).toBe(0);

      getOrSetCacheData(element, {
        "one-two": 2,
        three: 3,
      });

      expect(getOrSetCacheData(element, "one-two")).toBe(2);
      expect(getOrSetCacheData(element)).toEqual({
        oneTwo: 2,
        three: 3,
      });

      deleteCacheData(element, "one-two");
      deleteCacheData(element);

      expect(getCacheData(element, "one-two")).toBeUndefined();

      removeElementData(element);

      expect(Cache.size).toBe(0);
    });

    it("walks from non-cacheable child nodes to the parent element", () => {
      const parent = document.createElement("div");
      const text = document.createTextNode("text");

      parent.appendChild(text);

      setCacheData(text, "owner", "parent");

      expect(getCacheData(parent, "owner")).toBe("parent");
    });

    it("cleans descendant data and dispatches destroy for animated nodes", () => {
      const parent = document.createElement("div");
      const child = document.createElement("span");
      const events: string[] = [];

      child.setAttribute("data-ng-animate", "");
      child.addEventListener("$destroy", () => {
        events.push("destroy");
      });
      parent.appendChild(child);

      setCacheData(parent, "parentValue", 1);
      setCacheData(child, "childValue", 2);

      removeElement(parent);

      expect(events).toEqual(["destroy"]);
      expect(getCacheData(parent, "parentValue")).toBeUndefined();
      expect(getCacheData(child, "childValue")).toBeUndefined();
      expect(parent.innerHTML).toBe("");
    });
  });

  describe("transcluded host metadata", () => {
    it("resolves host elements from transclusion anchors and cloned trees", () => {
      const host = document.createElement("section");
      const source = document.createElement("div");
      const anchor = document.createComment("anchor");

      host.setAttribute("data-ng-click", "save()");
      source.appendChild(anchor);
      setTranscludedHostElement(anchor, host);

      const clone = source.cloneNode(true);

      cloneTranscludedHostElements(source, clone);

      const clonedAnchor = clone.firstChild as Comment;

      expect(getTranscludedHostElement(anchor)).toBe(host);
      expect(getDirectiveHostElement(anchor)).toBe(host);
      expect(getDirectiveHostElement(clonedAnchor)).toBe(host);
      expect(getNormalizedAttr(clonedAnchor, "ngClick")).toBe("save()");
      expect(hasNormalizedAttr(clonedAnchor, "ngClick")).toBeTrue();
      expect(getDirectiveHostElement(null)).toBeNull();
      expect(getDirectiveHostElement(document.createTextNode("x"))).toBeNull();
    });
  });

  describe("HTML helpers", () => {
    it("returns starting tags for text, comments, elements, and invalid input", () => {
      expect(startingTag("plain text")).toBe("plain text");
      expect(startingTag(document.createComment(" comment "))).toBe(
        "<!--comment-->",
      );
      expect(
        startingTag('<My-Widget attr="value"><span></span></My-Widget>'),
      ).toBe('<my-widget attr="value">');
      expect(() => startingTag({} as unknown as Element)).toThrowError(
        "Input must be an HTML string or a DOM element.",
      );
    });

    it("returns block nodes including intervening siblings", () => {
      const parent = document.createElement("div");
      const first = document.createElement("span");
      const middle = document.createElement("em");
      const last = document.createElement("strong");
      const detached = document.createElement("i");

      parent.append(first, middle, last);

      expect(getBlockNodes([first, last])).toEqual([first, middle, last]);
      expect(getBlockNodes([detached, last])).toEqual([detached, last]);
    });

    it("parses HTML fragments from the cache and evicts old entries", () => {
      const first = createElementFromHTML("<div><span>first</span></div>");
      const second = createElementFromHTML("<div><span>first</span></div>");

      expect(first).not.toBe(second);
      expect(first.outerHTML).toBe(second.outerHTML);

      for (let i = 0; i < 260; i++) {
        createNodelistFromHTML(`<span data-index="${i}"></span>`);
      }

      expect(createElementFromHTML("<p>after cache churn</p>").outerHTML).toBe(
        "<p>after cache churn</p>",
      );
    });
  });

  describe("getNormalizedAttrName", () => {
    it("returns the actual DOM attribute name for an exact normalized match", () => {
      const element = document.createElement("button");

      element.setAttribute("ng-click", "save()");

      expect(getNormalizedAttrName(element, "ngClick")).toBe("ng-click");
    });

    it("returns the data-prefixed DOM attribute name for aliased attributes", () => {
      const element = document.createElement("button");

      element.setAttribute("data-ng-click", "save()");

      expect(getNormalizedAttrName(element, "ngClick")).toBe("data-ng-click");
    });

    it("normalizes the requested name before matching", () => {
      const element = document.createElement("input");

      element.setAttribute("data-ng-model", "user.name");

      expect(getNormalizedAttrName(element, "data-ng-model")).toBe(
        "data-ng-model",
      );
      expect(getNormalizedAttrName(element, "ng-model")).toBe("data-ng-model");
    });

    it("returns the first matching attribute in DOM order", () => {
      const element = document.createElement("button");

      element.setAttribute("data-ng-click", "save()");
      element.setAttribute("ng-click", "submit()");

      expect(getNormalizedAttrName(element, "ngClick")).toBe("data-ng-click");
    });

    it("returns undefined for missing attributes and non-element nodes", () => {
      const element = document.createElement("button");

      expect(getNormalizedAttrName(element, "ngClick")).toBeUndefined();
      expect(
        getNormalizedAttrName(document.createTextNode("text"), "ngClick"),
      ).toBeUndefined();
      expect(getNormalizedAttrName(null, "ngClick")).toBeUndefined();
      expect(getNormalizedAttrName(undefined, "ngClick")).toBeUndefined();
    });
  });

  describe("setNormalizedAttr", () => {
    it("returns metadata without writing when requested", () => {
      const element = document.createElement("button");

      const result = setNormalizedAttr(element, "disabled", true, {
        writeAttr: false,
      });

      expect(result).toEqual({
        element,
        normalizedName: "disabled",
        observerName: "disabled",
        attrName: "disabled",
        observedValue: "true",
      });
      expect(element.hasAttribute("disabled")).toBeTrue();
    });

    it("writes and removes boolean attributes through DOM properties", () => {
      const element = document.createElement("button");

      setNormalizedAttr(element, "disabled", true);

      expect(element.disabled).toBeTrue();
      expect(element.hasAttribute("disabled")).toBeTrue();

      setNormalizedAttr(element, "disabled", false);

      expect(element.disabled).toBeFalse();
      expect(element.hasAttribute("disabled")).toBeFalse();
    });

    it("sets attributes with non-word starting names without parsing HTML", () => {
      const element = document.createElement("button");

      setNormalizedAttr(element, "title", "save", { attrName: "[title]" });

      expect(element.getAttribute("[title]")).toBe("save");
      expect(element.children.length).toBe(0);
    });
  });

  describe("DOM mutation helpers", () => {
    it("empties document fragments and preserves the host element", () => {
      const fragment = document.createDocumentFragment();
      const child = document.createElement("span");

      fragment.appendChild(child);
      setCacheData(child, "token", "value");

      emptyElement(fragment as unknown as Element);

      expect(fragment.childNodes.length).toBe(0);
      expect(getCacheData(child, "token")).toBe("value");
    });

    it("inserts before the first child when the anchor is stale", () => {
      const parent = document.createElement("div");
      const stale = document.createElement("span");
      const existing = document.createElement("b");
      const inserted = document.createElement("i");

      parent.appendChild(existing);

      domInsert(inserted, parent, stale);

      expect(Array.from(parent.children)).toEqual([inserted, existing]);
    });

    it("restores temporary animation insertion styles on the next frame", async () => {
      const parent = document.createElement("div");
      const element = document.createElement("span");

      element.style.visibility = "visible";
      element.style.position = "relative";
      element.style.pointerEvents = "auto";

      animatedomInsert(element, parent);

      expect(element.style.visibility).toBe("hidden");
      expect(element.style.position).toBe("absolute");
      expect(element.style.pointerEvents).toBe("none");
      expect(parent.firstChild).toBe(element);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(element.style.visibility).toBe("visible");
      expect(element.style.position).toBe("relative");
      expect(element.style.pointerEvents).toBe("auto");
    });

    it("extracts the first element from arrays of nodes", () => {
      const text = document.createTextNode("text");
      const element = document.createElement("span");

      expect(extractElementNode([text, element] as unknown as NodeList)).toBe(
        element,
      );
      expect(extractElementNode([text] as unknown as NodeList)).toBeUndefined();
    });
  });
});
