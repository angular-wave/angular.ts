/// <reference types="jasmine" />
import { createElementFromHTML, dealoc } from "../shared/dom.ts";
import { Angular } from "../angular.ts";

describe("$rootElement", () => {
  const angular = new Angular();

  it("should publish the bootstrap element into $rootElement", () => {
    const element = createElementFromHTML("<div></div>") as HTMLElement;

    const injector = angular.bootstrap(element, []);

    expect(injector.get("$rootElement")).toBe(element);
    dealoc(element);
  });
});
