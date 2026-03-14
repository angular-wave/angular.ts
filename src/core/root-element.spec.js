import { createElementFromHTML, dealoc } from "../shared/dom.js";
import { Angular } from "../angular.js";

describe("$rootElement", () => {
  let angular = new Angular();

  it("should publish the bootstrap element into $rootElement", () => {
    const element = createElementFromHTML("<div></div>");
    const injector = angular.bootstrap(element, []);

    expect(injector.get("$rootElement")).toBe(element);
    dealoc(element);
  });
});
