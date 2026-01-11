import { Angular } from "../../angular.js";
import { AnchorScrollProvider } from "./anchor-scroll.js";

describe("AnchorScrollProvider", () => {
  it("should exist", () => {
    const provider = new AnchorScrollProvider();
    expect(provider).toBeDefined();
  });

  it("should default autoScrollingEnabled to true", () => {
    const provider = new AnchorScrollProvider();
    expect(provider.autoScrollingEnabled).toBeTrue();
  });
});

describe("AnchorScrollService", () => {
  let $anchorScroll;
  let $injector;
  let el;

  beforeEach(() => {
    el = document.createElement("div");
    el.id = "app";
    document.body.appendChild(el);

    const angular = new Angular();
    angular.module("default", []);

    $injector = angular.bootstrap(el, ["default"]);
    $anchorScroll = $injector.get("$anchorScroll");
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it("should be injectable", () => {
    expect($anchorScroll).toBeDefined();
    expect(typeof $anchorScroll).toBe("function");
  });

  it("should scroll to top when called with no hash", () => {
    spyOn(window, "scrollTo");

    $anchorScroll();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("should scroll to element by id", () => {
    const target = document.createElement("div");
    target.id = "target";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");

    $anchorScroll("target");

    expect(target.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should scroll to first anchor by name", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("name", "myAnchor");
    document.body.appendChild(anchor);

    spyOn(anchor, "scrollIntoView");

    $anchorScroll("myAnchor");

    expect(anchor.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(anchor);
  });

  it("should support numeric hash values", () => {
    const target = document.createElement("div");
    target.id = "123";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");

    $anchorScroll(123);

    expect(target.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should apply numeric yOffset", () => {
    const target = document.createElement("div");
    target.id = "offset";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");
    spyOn(window, "scrollBy");

    $anchorScroll.yOffset = 40;

    $anchorScroll("offset");

    expect(window.scrollBy).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should support yOffset as a function", () => {
    const target = document.createElement("div");
    target.id = "fnOffset";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");
    spyOn(window, "scrollBy");

    $anchorScroll.yOffset = () => 25;

    $anchorScroll("fnOffset");

    expect(window.scrollBy).toHaveBeenCalled();

    document.body.removeChild(target);
  });
});
