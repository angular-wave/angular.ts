import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.ts";
import { createElementFromHTML } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("scriptDirective", () => {
  let $rootScope;
  let $compile;
  let $templateCache;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    createInjector(["myModule"]).invoke(
      (_$rootScope_, _$compile_, _$templateCache_) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $templateCache = _$templateCache_;
      },
    );
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
