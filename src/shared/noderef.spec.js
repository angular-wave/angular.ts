import { NodeRef } from "./noderef.js";

describe("NodeRef", () => {
  let div;
  let span;
  let textNode;

  beforeEach(() => {
    div = document.createElement("div");
    div.textContent = "hello";
    span = document.createElement("span");
    span.textContent = "world";
    textNode = document.createTextNode("plain text");
  });

  describe("constructor", () => {
    it("wraps a single Element", () => {
      const ref = new NodeRef(div);
      expect(ref.node).toBe(div);
      expect(ref.element).toBe(div);
      expect(ref.size).toBe(1);
      expect(ref._isList).toBeFalse();
      expect(ref._isElement()).toBeTrue();
    });

    it("wraps a single Node", () => {
      const ref = new NodeRef(textNode);
      expect(ref.node).toBe(textNode);
      expect(ref._isElement()).toBeFalse();
    });

    it("wraps an array of Nodes", () => {
      const ref = new NodeRef([div, span]);
      expect(ref.nodes).toEqual([div, span]);
      expect(ref._isList).toBeTrue();
      expect(ref.size).toBe(2);
    });

    it("wraps an array with one Node", () => {
      const ref = new NodeRef([div]);
      expect(ref.node).toBe(div);
      expect(ref._isList).toBeFalse();
      expect(ref.size).toBe(1);
    });

    it("wraps a NodeList", () => {
      const parent = document.createElement("div");
      parent.append(div, span);
      const ref = new NodeRef(parent.childNodes);
      expect(ref.nodes).toEqual([div, span]);
      expect(ref._isList).toBeTrue();
    });

    it("wraps an HTML string", () => {
      const html = "<p>hi</p>";
      const ref = new NodeRef(html);
      expect(ref.element.tagName.toLowerCase()).toBe("p");
      expect(ref.element.textContent).toBe("hi");
    });

    it("handles HTML string with multiple nodes", () => {
      const html = "<div>A</div><span>B</span>";
      const ref = new NodeRef(html);
      expect(ref._getAny().outerHTML).toContain("div");
    });

    it("throws on invalid input", () => {
      expect(() => new NodeRef(123)).toThrowError(
        "Invalid element passed to NodeRef",
      );
      expect(() => new NodeRef(null)).toThrow();
      expect(() => new NodeRef(undefined)).toThrow();
    });
  });

  describe("getters and setters", () => {
    it("sets and gets node", () => {
      const ref = new NodeRef(div);
      const newDiv = document.createElement("div");
      ref.node = newDiv;
      expect(ref.node).toBe(newDiv);
      expect(ref.element).toBe(newDiv);
    });

    it("sets and gets nodes array", () => {
      const ref = new NodeRef(div);
      ref.nodes = [div, span];
      expect(ref.nodes).toEqual([div, span]);
      expect(ref._isList).toBeTrue();
    });

    it("returns correct element and node", () => {
      const ref = new NodeRef(div);
      expect(ref.element).toBe(div);
      expect(ref.node).toBe(div);
    });

    it("returns size correctly", () => {
      const ref1 = new NodeRef(div);
      const ref2 = new NodeRef([div, span]);
      expect(ref1.size).toBe(1);
      expect(ref2.size).toBe(2);
    });
  });

  describe("list and collection methods", () => {
    it("getAny() returns first node of list", () => {
      const ref = new NodeRef([div, span]);
      expect(ref._getAny()).toBe(div);
    });

    it("getAll() returns all nodes", () => {
      const ref = new NodeRef([div, span]);
      expect(ref._getAll()).toEqual([div, span]);
    });

    it("collection() always returns array", () => {
      const ref1 = new NodeRef(div);
      const ref2 = new NodeRef([div, span]);
      expect(ref1._collection()).toEqual([div]);
      expect(ref2._collection()).toEqual([div, span]);
    });

    it("getIndex() and setIndex() work properly", () => {
      const ref = new NodeRef([div, span]);
      expect(ref._getIndex(1)).toBe(span);
      const newNode = document.createElement("p");
      ref._setIndex(1, newNode);
      expect(ref._getIndex(1)).toBe(newNode);
    });
  });

  describe("nodelist and clone", () => {
    it("returns live nodelist if attached to DOM", () => {
      const parent = document.createElement("div");
      parent.append(div, span);
      const ref = new NodeRef([div, span]);
      const list = ref.nodelist;
      expect(list[0]).toBe(div);
      expect(list[1]).toBe(span);
    });

    it("returns fragment-based nodelist if detached", () => {
      const ref = new NodeRef([div, span]);
      const list = ref.nodelist;
      expect(list.length).toBe(2);
      expect(list[0].isEqualNode(div)).toBeTrue();
    });

    it("clone() creates deep copy", () => {
      const ref = new NodeRef([div, span]);
      const clone = ref._clone();
      expect(clone.nodes[0].isEqualNode(div)).toBeTrue();
      expect(clone.nodes[0]).not.toBe(div);
    });

    it("clone() works on single element", () => {
      const ref = new NodeRef(div);
      const clone = ref._clone();
      expect(clone.node.isEqualNode(div)).toBeTrue();
      expect(clone.node).not.toBe(div);
    });
  });

  describe("edge cases", () => {
    it("handles text node only", () => {
      const ref = new NodeRef(textNode);
      expect(ref.node.textContent).toBe("plain text");
      expect(ref._isElement()).toBeFalse();
    });

    it("handles DocumentFragment", () => {
      const frag = document.createDocumentFragment();
      frag.append(div, span);
      const ref = new NodeRef(frag.childNodes);
      expect(ref._isList).toBeTrue();
      expect(ref.nodes.length).toBe(2);
    });

    it("handles malformed HTML string gracefully", () => {
      const html = "<div><span>Missing close";
      const ref = new NodeRef(html);
      expect(ref.node).toBeTruthy();
      expect(ref._getAny().nodeType).toBe(Node.ELEMENT_NODE);
    });
  });
});
