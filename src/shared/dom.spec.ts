/// <reference types="jasmine" />
import { getNormalizedAttrName } from "./dom.ts";

describe("dom", () => {
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
});
