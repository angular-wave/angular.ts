/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { createElementFromHTML } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { scriptDirective } from "./script.ts";

describe("scriptDirective", () => {
  let $rootScope: any;

  let $compile: any;

  let $templateCache: any;

  let $attributes: any;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    createInjector(["myModule"]).invoke(
      (
        _$rootScope_: any,
        _$compile_: any,
        _$templateCache_: any,
        _$attributes_: any,
      ) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $templateCache = _$templateCache_;
        $attributes = _$attributes_;
      },
    );
  });

  it("should cache ng-template contents during compile", () => {
    const directive = scriptDirective($templateCache, $attributes);

    const element = document.createElement("script");

    element.innerText = "<p>cached</p>";
    element.setAttribute("type", "text/ng-template");
    element.setAttribute("id", "cached.html");
    directive.compile!(element, {} as any);

    expect($templateCache.get("cached.html")).toBe("<p>cached</p>");
  });

  it("should read data-type and data-id from the host element", () => {
    const directive = scriptDirective($templateCache, $attributes);

    const element = document.createElement("script");

    element.innerText = "<p>cached from data attrs</p>";
    element.setAttribute("data-type", "text/ng-template");
    element.setAttribute("data-id", "data-cached.html");
    directive.compile!(element, {} as any);

    expect($templateCache.get("data-cached.html")).toBe(
      "<p>cached from data attrs</p>",
    );
  });

  it("should ignore non-template scripts during compile", () => {
    const directive = scriptDirective($templateCache, $attributes);

    const element = document.createElement("script");

    element.innerText = "ignored";
    element.setAttribute("type", "text/javascript");
    element.setAttribute("id", "ignored.js");
    directive.compile!(element, {} as any);

    expect($templateCache.get("ignored.js")).toBeUndefined();
  });

  it("should not cache a template script when id is missing", () => {
    const directive = scriptDirective($templateCache, $attributes);

    const element = document.createElement("script");

    element.innerText = "missing id";
    element.setAttribute("type", "text/ng-template");
    directive.compile!(element, {} as any);

    expect($templateCache.get(undefined as any)).toBeUndefined();
  });

  it("should populate $templateCache with contents of a ng-template script element", () => {
    $compile(
      "<div>foo" +
        '<script id="/ignore">ignore me</script>' +
        '<script type="text/ng-template" id="/myTemplate.html"><x>{{y}}</x></script>' +
        "</div>",
    );
    expect($templateCache.get("/myTemplate.html")).toBe("<x>{{y}}</x>");
    expect($templateCache.get("/ignore")).toBeUndefined();
  });

  it("should not compile scripts", async () => {
    const doc = createElementFromHTML(`<div>
      foo
      <script type="text/javascript">some {{binding}}</script>
      <script type="text/ng-template" id="/some">other {{binding}}</script>
    </div>`);

    $compile(doc)($rootScope);
    await wait();
    const scripts = doc.querySelectorAll("script");

    expect(scripts[0].text).toBe("some {{binding}}");
    expect(scripts[1].text).toBe("other {{binding}}");
  });
});
