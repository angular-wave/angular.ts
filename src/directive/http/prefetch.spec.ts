/// <reference types="jasmine" />
import { defined } from "../../shared/test-fixtures.spec.ts";
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { browserTrigger, waitUntil } from "../../shared/test-utils.ts";

describe("ng-get prefetch pattern", () => {
  let $compile: ng.CompileService, $rootScope: ng.Scope, el: HTMLElement;

  beforeEach(() => {
    el = defined(document.getElementById("app"));
    dealoc(el);
    el.innerHTML = "";

    const angular = new Angular();
    angular.createModule("default", []);
    angular.bootstrap(el, ["default"]).invoke([
      "$compile",
      "$rootScope",
      (_$compile_: ng.CompileService, _$rootScope_: ng.Scope) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => dealoc(el));

  function renderPreview() {
    const preview: { preview?: { name: string } } = {};
    const scope = Object.assign($rootScope.new(), preview);
    el.innerHTML = `
      <div ng-get="/mock/jsonobject" data-trigger="mouseenter"
           on-success="preview = $res">
        <button type="button" ng-click="showPreview = true">Show</button>
        <div ng-if="showPreview && !preview" ng-get="/mock/jsonobject"
             data-trigger="load" on-success="preview = $res">Loading</div>
        <section ng-if="showPreview && preview">{{ preview.name }}</section>
      </div>`;
    $compile(el)(scope);

    return scope;
  }

  it("prefetches while hidden and renders the data on click", async () => {
    const scope = renderPreview();
    const host = el.querySelector("div");

    browserTrigger(defined(host), "mouseenter");
    await waitUntil(() => scope.preview?.name === "Bob");
    expect(el.querySelector("section")).toBeNull();

    browserTrigger(defined(el.querySelector("button")), "click");
    await waitUntil(() => el.querySelector("section")?.textContent === "Bob");
    expect(el.textContent).not.toContain("Loading");
  });

  it("loads on click when pointer prefetch did not run", async () => {
    const scope = renderPreview();

    browserTrigger(defined(el.querySelector("button")), "click");
    await waitUntil(() => scope.preview?.name === "Bob");
    await waitUntil(() => el.querySelector("section")?.textContent === "Bob");

    expect(el.textContent).not.toContain("Loading");
  });
});
