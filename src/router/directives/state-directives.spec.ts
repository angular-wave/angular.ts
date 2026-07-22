// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait, waitUntil } from "../../shared/test-utils.ts";

function registerStates(module, ...states) {
  states.forEach((state) => module.router(state));
}

describe("ngStateRef", () => {
  window.location.hash = "";
  let app = document.getElementById("app"),
    el,
    el2,
    template,
    scope,
    $rootScope,
    $compile,
    $injector,
    $state,
    errorLog = [];

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    app.innerHTML = "";
    window.location.hash = "";
    window.angular = new Angular();
    const module = window.angular
      .module("defaultModule", [])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          errorLog.push(exception.message);
        };
      });

    module.config({
      $location: { html5Mode: false, hashPrefix: "" },
    });
    registerStates(
      module,
      { name: "top", url: "" },
      { name: "other", url: "/other/:id", template: "other" },
      { name: "other.detail", url: "/detail", template: "detail" },
      {
        name: "contacts",
        url: "/contacts",
        template:
          '<a ng-state="\'.item\'" ng-state-params="{ id: 5 }" class="item">Person</a> <ng-view></ng-view>',
      },
      {
        name: "contacts.item",
        url: "/{id:int}",
        template:
          '<a ng-state="\'.detail\'" class="item-detail">Detail</a> | <a ng-state="\'^\'" class="item-parent">Parent</a> | <ng-view></ng-view>',
      },
      {
        name: "contacts.item.detail",
        template:
          '<div class="title">Detail</div> | <a ng-state="\'^\'" class="item-parent2">Item</a>',
      },
    );
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);
    $rootScope = $injector.get("$rootScope");
    $compile = $injector.get("$compile");
    $state = $injector.get("$state");
  });

  afterEach(() => (window.location.hash = ""));

  async function waitForState(name, params = {}) {
    await waitUntil(
      () =>
        $state.current.name === name &&
        Object.entries(params).every(
          ([key, value]) => $state.params[key] === value,
        ),
    );
  }

  async function waitForHref(anchor, href) {
    await waitUntil(() => anchor.getAttribute("href") === href);
  }

  describe("links with promises", () => {
    it("should update the href when promises on parameters change before scope is applied", async () => {
      const defer = Promise.withResolvers();

      app.innerHTML =
        '<a ng-state="\'contacts.item.detail\'" ng-state-params="{ id: contact.id }">Details</a>';
      defer.promise.then((val) => {
        $rootScope.contact = val;
      });
      defer.resolve({ id: 6 });
      el = $compile(app)($rootScope);
      await wait();
      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/6");
    });

    it("supports data-ng-state normalized reads", async () => {
      app.innerHTML =
        '<a data-ng-state="\'contacts.item.detail\'" data-ng-state-params="{ id: contact.id }">Details</a>';
      $rootScope.contact = { id: 6 };
      $compile(app)($rootScope);
      await wait();

      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/6");
    });

    it("tracks descendant active state with data-state-active", async () => {
      app.innerHTML =
        '<a ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }" data-state-active>Item</a>';
      $compile(app)($rootScope);
      const anchor = app.querySelector("a");

      expect(anchor.getAttribute("data-state-current")).toBe("false");

      await $state.transitionTo("contacts.item.detail", { id: 6 });
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("true");

      await $state.transitionTo("contacts.item.detail", { id: 7 });
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("false");
    });

    it("tracks exact active state with data-state-exact", async () => {
      app.innerHTML =
        '<a ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }" data-state-active data-state-exact>Item</a>';
      $compile(app)($rootScope);
      const anchor = app.querySelector("a");

      await $state.transitionTo("contacts.item", { id: 6 });
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("true");

      await $state.transitionTo("contacts.item.detail", { id: 6 });
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("false");
    });

    it("updates data-state-current when ng-state params change", async () => {
      app.innerHTML =
        '<a ng-state="\'contacts.item\'" ng-state-params="{ id: contact.id }" data-state-active>Item</a>';
      $rootScope.contact = { id: 6 };
      $compile(app)($rootScope);
      const anchor = app.querySelector("a");

      await $state.transitionTo("contacts.item", { id: 6 });
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("true");

      $rootScope.contact = { id: 7 };
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("false");
    });

    it("clears managed current state when data-state modifiers are removed", async () => {
      app.innerHTML =
        '<a ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }" data-state-active>Item</a>';
      $compile(app)($rootScope);
      const anchor = app.querySelector("a");

      await $state.transitionTo("contacts.item", { id: 6 });
      await wait();
      expect(anchor.getAttribute("data-state-current")).toBe("true");
      expect(anchor.getAttribute("aria-current")).toBe("page");

      anchor.removeAttribute("data-state-active");
      await wait();

      expect(anchor.hasAttribute("data-state-current")).toBeFalse();
      expect(anchor.hasAttribute("aria-current")).toBeFalse();
    });

    it("marks empty dynamic ng-state targets as not current", async () => {
      app.innerHTML = '<a ng-state="emptyState" data-state-active>Item</a>';
      $rootScope.emptyState = "";
      $compile(app)($rootScope);
      const anchor = app.querySelector("a");

      await wait();

      expect(anchor.getAttribute("data-state-current")).toBe("false");
    });

    it("adds route-link ARIA defaults for non-native ng-state links", async () => {
      app.innerHTML =
        '<div ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }" data-state-active>Item</div>';
      $compile(app)($rootScope);
      const link = app.querySelector("div[ng-state]");

      expect(link.getAttribute("role")).toBe("link");
      expect(link.getAttribute("tabindex")).toBe("0");
      expect(link.getAttribute("aria-current")).toBeNull();

      browserTrigger(link, { type: "keydown", key: "Enter" });
      await waitForState("contacts.item", { id: 6 });

      expect(link.getAttribute("aria-current")).toBe("page");
    });

    it("ignores non-activation keys on non-native ng-state links", async () => {
      app.innerHTML =
        '<div ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }">Item</div>';
      $compile(app)($rootScope);
      const link = app.querySelector("div[ng-state]");

      browserTrigger(link, { type: "keydown", key: "Escape" });
      await wait();

      expect($state.current.name).toBe("top");
      expect($state.params.id).toBeUndefined();
    });

    it("preserves authored route-link ARIA attributes", async () => {
      app.innerHTML =
        '<div ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }" data-state-active role="menuitem" tabindex="2" aria-current="step">Item</div>';
      $compile(app)($rootScope);
      const link = app.querySelector("div[ng-state]");

      await $state.transitionTo("contacts.item", { id: 6 });
      await wait();
      expect(link.getAttribute("role")).toBe("menuitem");
      expect(link.getAttribute("tabindex")).toBe("2");
      expect(link.getAttribute("aria-current")).toBe("step");

      await $state.transitionTo("contacts.item", { id: 7 });
      await wait();
      expect(link.getAttribute("aria-current")).toBe("step");
    });

    it("honors ng-aria-disable for route-link ARIA defaults", async () => {
      app.innerHTML =
        '<div ng-state="\'contacts.item\'" ng-state-params="{ id: 6 }" data-state-active ng-aria-disable>Item</div>';
      $compile(app)($rootScope);
      const link = app.querySelector("div[ng-state]");

      await $state.transitionTo("contacts.item", { id: 6 });
      await wait();
      expect(link.hasAttribute("role")).toBeFalse();
      expect(link.hasAttribute("tabindex")).toBeFalse();
      expect(link.hasAttribute("aria-current")).toBeFalse();
    });

    it("handles long ng-state expressions without regex backtracking", async () => {
      app.innerHTML = `<a ng-state="${" ".repeat(200)}'contacts.item.detail'" ng-state-params="{ id: contact.id }">Details</a>`;
      $rootScope.contact = { id: 6 };
      $compile(app)($rootScope);
      await wait();

      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/6");
    });
  });

  async function buildDOM() {
    window.location.hash = "#";
    app.innerHTML =
      '<a ng-state="\'contacts.item.detail\'" ng-state-params="{ id: contact.id }">Details</a>' +
      "<a ng-state=\"'top'\">Top</a>";
    scope = $rootScope;
    scope.contact = { id: 5 };
    await wait();
    $compile(app)(scope);
    await wait();
    el = app.querySelectorAll("a")[0];
    el2 = app.querySelectorAll("a")[1];
  }

  async function buildHtml5DOM() {
    window.history.replaceState(null, "", "/");
    app.innerHTML =
      '<a ng-state="\'contacts.item.detail\'" ng-state-params="{ id: contact.id }">Details</a>' +
      "<a ng-state=\"'top'\">Top</a>";
    scope = $rootScope;
    scope.contact = { id: 5 };
    await wait();
    $compile(app)(scope);
    await wait();
    el = app.querySelectorAll("a")[0];
    el2 = app.querySelectorAll("a")[1];
  }

  describe("links", () => {
    beforeEach(async () => {
      await buildDOM();
    });
    afterEach(() => {
      window.location.hash = "";
    });

    it("should generate the correct href", () => {
      expect(el.getAttribute("href")).toBe("#/contacts/5");
      expect(el2.getAttribute("href")).toBe("#");
    });

    it("should update the href when parameters change", async () => {
      expect(el.getAttribute("href")).toBe("#/contacts/5");
      scope.contact.id = 6;
      await wait();
      expect(el.getAttribute("href")).toBe("#/contacts/6");
    });

    it("should allow multi-line attribute values", async () => {
      app.innerHTML =
        '<a ng-state="\'contacts.item.detail\'" ng-state-params="{id: $index}">Details</a>';
      $rootScope.$index = 3;
      await wait();
      $compile(app)($rootScope);
      await wait();
      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/3");
    });

    it("should transition states when left-clicked", async () => {
      browserTrigger(el, "click");
      await waitForState("contacts.item.detail", { id: 5 });
      expect($state.current.name).toEqual("contacts.item.detail");
      expect($state.params.id).toEqual(5);
    });

    it("should not transition states when ctrl-clicked", async () => {
      el.dispatchEvent(
        new MouseEvent("click", {
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await wait(200);
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should not transition states when meta-clicked", async () => {
      expect($state.current.name).toEqual("top");
      await wait();
      el.dispatchEvent(new MouseEvent("click", { metaKey: true }));
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should not transition states when shift-clicked", async () => {
      expect($state.current.name).toEqual("top");
      el.dispatchEvent(new MouseEvent("click", { shiftKey: true }));
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should not transition states when alt-clicked", async () => {
      expect($state.current.name).toEqual("top");
      el.dispatchEvent(new MouseEvent("click", { altKey: true }));
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should not transition states when middle-clicked", async () => {
      expect($state.current.name).toEqual("top");
      el.dispatchEvent(new MouseEvent("click", { button: 1 }));
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should not transition states when element has target specified", async () => {
      expect($state.current.name).toEqual("top");
      el.setAttribute("target", "_blank");
      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should not transition states if preventDefault() is called in click handler", async () => {
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
      el.onclick = (e) => e.preventDefault();

      browserTrigger(el, "click");
      await wait(100);
      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should allow passing params to current state", async () => {
      $state.go("other", { id: "abc" });
      $rootScope.$index = "def";
      app.innerHTML =
        '<a ng-state="" ng-state-params="{id: $index}">Details</a>';
      $compile(app)($rootScope);

      await waitForState("other", { id: "abc" });
      await waitForHref(app.querySelector("a"), "#/other/def");
      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("abc");
      expect(app.querySelector("a").getAttribute("href")).toBe("#/other/def");
      el = app.querySelector("a");
      browserTrigger(el, "click");
      await waitForState("other", { id: "def" });
      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("def");
      //
      $rootScope.$index = "ghi";
      $state.go("other.detail");
      await waitForState("other.detail", { id: "def" });
      await waitForHref(el, "#/other/ghi/detail");
      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("def");
      expect(el.getAttribute("href")).toBe("#/other/ghi/detail");

      browserTrigger(el, "click");
      await waitForState("other.detail", { id: "ghi" });
      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("ghi");
    });

    it("should allow multi-line attribute values when passing params to current state", async () => {
      $state.go("contacts.item.detail", { id: "123" });
      app.innerHTML =
        '<a ng-state="" ng-state-params="{\n\tid: $index\n}">Details</a>';
      $rootScope.$index = 3;
      await wait();

      $compile(app)($rootScope);
      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/3");
    });

    it("should take an object as a parameter and update properly on digest churns", async () => {
      app.innerHTML =
        '<div><a ng-state="\'contacts.item.detail\'" ng-state-params="urlParams">Contacts</a></div>';

      $compile(app)($rootScope);

      $rootScope.urlParams = { id: 1 };
      await wait();

      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/1");

      $rootScope.urlParams.id = 2;
      await wait();

      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/2");
    });
  });

  describe("links in html5 mode", () => {
    let originalUrl;

    beforeEach(async () => {
      originalUrl =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      dealoc(document.getElementById("app"));
      app.innerHTML = "";
      window.history.replaceState(null, "", "/");
      window.angular = new Angular();
      const module = window.angular
        .module("html5Module", [])
        .decorator("$exceptionHandler", function () {
          return (exception) => {
            errorLog.push(exception.message);
          };
        });

      module.config({
        $location: {
          html5Mode: { enabled: true, requireBase: false },
          hashPrefix: "",
        },
      });
      registerStates(
        module,
        { name: "top", url: "" },
        { name: "other", url: "/other/:id", template: "other" },
        { name: "other.detail", url: "/detail", template: "detail" },
        {
          name: "contacts",
          url: "/contacts",
          template:
            '<a ng-state="\'.item\'" ng-state-params="{ id: 5 }" class="item">Person</a> <ng-view></ng-view>',
        },
        {
          name: "contacts.item",
          url: "/{id:int}",
          template:
            '<a ng-state="\'.detail\'" class="item-detail">Detail</a> | <a ng-state="\'^\'" class="item-parent">Parent</a> | <ng-view></ng-view>',
        },
        {
          name: "contacts.item.detail",
          template:
            '<div class="title">Detail</div> | <a ng-state="\'^\'" class="item-parent2">Item</a>',
        },
      );

      $injector = window.angular.bootstrap(document.getElementById("app"), [
        "html5Module",
      ]);
      $rootScope = $injector.get("$rootScope");
      $compile = $injector.get("$compile");
      $state = $injector.get("$state");
      await buildHtml5DOM();
    });

    afterEach(() => {
      window.history.replaceState(null, "", originalUrl);
    });

    it("should generate the correct href", () => {
      expect(el.getAttribute("href")).toBe("/contacts/5");
      expect(el2.getAttribute("href")).toBe("");
    });

    it("should update the href when parameters change", async () => {
      expect(el.getAttribute("href")).toBe("/contacts/5");
      scope.contact.id = 6;
      await wait();
      expect(el.getAttribute("href")).toBe("/contacts/6");
    });

    it("should generate ng-state hrefs in html5 mode", async () => {
      app.innerHTML =
        '<a ng-state="\'contacts.item.detail\'" ng-state-params="{ id: contact.id }">Details</a>' +
        "<a ng-state=\"'top'\">Top</a>";
      scope.contact = { id: 5 };
      $compile(app)(scope);
      await wait();

      const stateLinks = app.querySelectorAll("a");

      expect(stateLinks[0].getAttribute("href")).toBe("/contacts/5");
      expect(stateLinks[1].getAttribute("href")).toBe("");

      scope.contact.id = 6;
      await wait();
      expect(stateLinks[0].getAttribute("href")).toBe("/contacts/6");
    });
  });

  describe("links with dynamic state definitions", () => {
    let template;

    beforeEach(() => {
      el = createElementFromHTML(
        '<a ng-state-active="active" ng-state-active-exact="activeeq" ng-state="state" ng-state-params="params">state</a>',
      );
      scope = $rootScope;
      Object.assign(scope, { state: "contacts", params: {} });
      template = $compile(el)(scope);
    });

    it("sets the correct initial href", () => {
      expect(template.getAttribute("href")).toBe("#/contacts");
    });

    it("supports data-ng-state normalized reads", () => {
      el = createElementFromHTML(
        '<a data-ng-state="state" data-ng-state-params="params">state</a>',
      );
      scope = $rootScope;
      Object.assign(scope, { state: "contacts", params: {} });
      template = $compile(el)(scope);

      expect(template.getAttribute("href")).toBe("#/contacts");
    });

    it("updates to the new href", async () => {
      expect(el.getAttribute("href")).toBe("#/contacts");

      scope.state = "contacts.item";
      scope.params = { id: 5 };
      await wait();
      expect(el.getAttribute("href")).toBe("#/contacts/5");
      // have to do an explicit update of params
      scope.params = { id: 25 };
      await wait();
      expect(el.getAttribute("href")).toBe("#/contacts/25");
    });

    it("updates a linked ng-state-active", async () => {
      expect(template.className).not.toContain("active");
      expect(template.className).not.toContain("activeeq");

      $state.go("contacts");
      await waitUntil(() => template.className.includes("active activeeq"));
      expect(template.className).toContain("active activeeq");

      scope.state = "contacts.item";
      scope.params = { id: 5 };
      await waitUntil(() => template.getAttribute("href") === "#/contacts/5");
      expect(template.className).not.toContain("active");
      expect(template.className).not.toContain("activeeq");

      $state.go("contacts.item", { id: -5 });
      await waitForState("contacts.item", { id: -5 });
      expect(template.className).not.toContain("active");
      expect(template.className).not.toContain("activeeq");

      $state.go("contacts.item", { id: 5 });
      await waitUntil(() => template.className.includes("active activeeq"));
      expect(template.className).toContain("active activeeq");

      scope.state = "contacts";
      scope.params = {};
      await waitUntil(
        () =>
          template.className.includes("active") &&
          !template.className.includes("activeeq"),
      );
      expect(template.className).toContain("active");
      expect(template.className).not.toContain("activeeq");
    });

    it("updates to a new href when it points to a new state", async () => {
      expect(template.getAttribute("href")).toBe("#/contacts");
      scope.state = "other";
      scope.params = { id: "123" };
      await waitForHref(template, "#/other/123");
      expect(template.getAttribute("href")).toBe("#/other/123");
    });

    it("transitions states when left-clicked", async () => {
      scope.state = "contacts.item.detail";
      scope.params = { id: 5 };
      await waitForHref(template, "#/contacts/5");

      browserTrigger(template, "click");
      await waitForState("contacts.item.detail", { id: 5 });

      expect($state.current.name).toEqual("contacts.item.detail");
      expect($state.params.id).toEqual(5);
    });

    it("does not transition states when modifier-clicked", async () => {
      scope.state = "contacts.item.detail";
      scope.params = { id: 5 };
      await waitForHref(template, "#/contacts/5");

      const modifiedClicks = [
        { ctrlKey: true, bubbles: true, cancelable: true },
        { metaKey: true, bubbles: true, cancelable: true },
        { shiftKey: true, bubbles: true, cancelable: true },
        { altKey: true, bubbles: true, cancelable: true },
        { button: 1, bubbles: true, cancelable: true },
      ];

      for (const options of modifiedClicks) {
        await $state.go("top");
        template.dispatchEvent(new MouseEvent("click", options));
        await wait(100);
        expect($state.current.name).toEqual("top");
        expect($state.params.id).toBeUndefined();
      }
    });

    it("does not transition states when target is set", async () => {
      scope.state = "contacts.item.detail";
      scope.params = { id: 5 };
      template.setAttribute("target", "_blank");
      await waitForHref(template, "#/contacts/5");

      browserTrigger(template, "click");
      await wait(100);

      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("does not transition states when preventDefault is called", async () => {
      scope.state = "contacts.item.detail";
      scope.params = { id: 5 };
      template.onclick = (event) => event.preventDefault();
      await waitForHref(template, "#/contacts/5");

      browserTrigger(template, "click");
      await wait(100);

      expect($state.current.name).toEqual("top");
      expect($state.params.id).toBeUndefined();
    });

    it("should allow passing params to current state using empty ng-state", async () => {
      await $state.go("other", { id: "abc" });
      $rootScope.$index = "def";
      app.innerHTML =
        '<a ng-state="" ng-state-params="{id: $index}">Details</a>';
      $compile(app)($rootScope);
      await waitForHref(app.querySelector("a"), "#/other/def");
      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("abc");
      expect(app.querySelector("a").getAttribute("href")).toBe("#/other/def");

      browserTrigger(app.querySelector("a"), "click");
      await waitForState("other", { id: "def" });

      expect($state.current.name).toBe("other");
      expect($state.params.id).toEqual("def");

      $rootScope.$index = "ghi";
      await $state.go("other.detail");
      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("def");

      expect(app.querySelector("a").getAttribute("href")).toBe(
        "#/other/ghi/detail",
      );

      browserTrigger(app.querySelector("a"), "click");
      await waitForState("other.detail", { id: "ghi" });

      expect($state.current.name).toBe("other.detail");
      expect($state.params.id).toEqual("ghi");
    });

    it("retains the old href if the new points to a non-state", () => {
      expect(template.getAttribute("href")).toBe("#/contacts");
      scope.state = "nostate";
      expect(template.getAttribute("href")).toBe("#/contacts");
    });

    it("updates hrefs when parameter overrides are reassigned", async () => {
      scope.state = "contacts.item";
      scope.params = { id: 10 };
      await wait();
      expect(template.getAttribute("href")).toBe("#/contacts/10");

      // explicit reassign on params
      scope.params = { id: 22 };
      await wait();
      expect(template.getAttribute("href")).toBe("#/contacts/22");
    });

    it("watches attributes", async () => {
      app.innerHTML =
        '<a ng-state="{{exprvar}}" ng-state-params="params">state</a>';
      template = $compile(app)(scope);
      await waitUntil(() => app.querySelector("a") !== null);
      scope.exprvar = "state1";
      scope.state1 = "contacts.item";
      scope.state2 = "other";
      scope.params = { id: 10 };
      await waitForHref(app.querySelector("a"), "#/contacts/10");
      expect(app.querySelector("a").getAttribute("href")).toBe("#/contacts/10");

      scope.exprvar = "state2";
      await waitForHref(app.querySelector("a"), "#/other/10");
      expect(app.querySelector("a").getAttribute("href")).toBe("#/other/10");
    });

    it("accepts option overrides", async () => {
      el = '<a ng-state="state" ng-state-opts="opts">state</a>';
      scope.state = "contacts";
      scope.opts = { reload: true };
      template = $compile(el)(scope);
      spyOn($state, "go").and.callThrough();

      browserTrigger(template, "click");
      await waitUntil(() => $state.go.calls.any());
      const transitionOptions = $state.go.calls.all()[0].args[2];

      expect(transitionOptions.reload).toEqual(true);
      expect(transitionOptions.absolute).toBeUndefined();
    });

    describe("option event", () => {
      beforeEach(() => (window.location.hash = ""));
      it("should bind click event by default", async () => {
        scope.state = "contacts";
        el = $compile('<a ng-state="state"></a>')(scope);
        await wait(100);
        browserTrigger(el, "click");
        await wait(100);

        expect($state.current.name).toBe("contacts");
      });

      it("should bind single HTML events", async () => {
        el = createElementFromHTML(
          '<input type="text" ng-state="state" ng-state-opts="{ events: [\'change\'] }">',
        );

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "change");
        await wait(100);

        expect($state.current.name).toEqual("contacts");
      });

      it("should bind multiple HTML events", async () => {
        el = createElementFromHTML(
          '<input type="text" ng-state="state" ng-state-opts="{ events: [\'change\', \'blur\'] }">',
        );

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "change");
        await wait(100);
        expect($state.current.name).toEqual("contacts");

        $state.go("top");
        await wait(100);
        expect($state.current.name).toEqual("top");

        browserTrigger(el, "blur");
        await wait(100);

        expect($state.current.name).toEqual("contacts");
      });

      it("should bind multiple Mouse events", async () => {
        el = createElementFromHTML(
          "<a ng-state=\"state\" ng-state-opts=\"{ events: ['mouseover', 'mousedown'] }\">",
        );

        scope.state = "contacts";
        $compile(el)(scope);
        browserTrigger(el, "mouseover");
        await wait(100);
        expect($state.current.name).toEqual("contacts");

        $state.go("top");
        await wait(100);
        expect($state.current.name).toEqual("top");

        browserTrigger(el, "mousedown");
        await wait(100);
        expect($state.current.name).toEqual("contacts");
      });
    });
  });

  describe("forms", () => {
    let el, scope;

    beforeEach(() => {
      el = createElementFromHTML(
        '<form ng-state="\'contacts.item.detail\'" ng-state-params="{ id: contact.id }"></form>',
      );
      scope = $rootScope;
      scope.contact = { id: 5 };
      $compile(el)(scope);
    });

    it("should generate the correct action", () => {
      expect(el.getAttribute("action")).toBe("#/contacts/5");
    });

    it("should generate the correct action with ng-state", () => {
      el = createElementFromHTML(
        '<form ng-state="\'contacts.item.detail\'" ng-state-params="{ id: contact.id }"></form>',
      );
      scope = $rootScope;
      scope.contact = { id: 5 };
      $compile(el)(scope);

      expect(el.getAttribute("action")).toBe("#/contacts/5");
    });
  });

  describe("relative transitions", () => {
    beforeEach(async () => {
      scope = $rootScope;
      el = $compile("<a ng-state=\"'.detail'\">Details</a>")(scope);
      $state.transitionTo("contacts.item", { id: 5 });
      template = $compile("<div><ng-view></ng-view><div>")(scope);
      await wait(200);
      errorLog = [];
    });

    it("should work", async () => {
      $state.transitionTo("contacts.item", { id: 5 });
      await wait(200);
      browserTrigger(el, "click");
      await wait(200);

      expect($state.$current.name).toBe("contacts.item.detail");
      expect($state.params.id).toEqual(5);
    });

    it("should work with ng-state", async () => {
      el = $compile("<a ng-state=\"'.detail'\">Details</a>")(scope);
      $state.transitionTo("contacts.item", { id: 5 });
      await wait(200);
      browserTrigger(el, "click");
      await wait(200);

      expect($state.$current.name).toBe("contacts.item.detail");
      expect($state.params.id).toEqual(5);
    });

    it("should resolve states from parent ngView", async () => {
      $state.transitionTo("contacts");
      await wait(500);
      const parentToChild = template.querySelector("a.item");

      browserTrigger(parentToChild, "click");
      await wait(500);

      expect($state.$current.name).toBe("contacts.item");
    });

    it("should update the browser from root scope after a view-scoped link transition", async () => {
      $state.transitionTo("contacts");
      await wait(500);

      const parentToChild = template.querySelector("a.item");

      browserTrigger(parentToChild, "click");
      await wait(500);

      const childToDetail = template.querySelector("a.item-detail");

      browserTrigger(childToDetail, "click");
      await wait(500);

      expect($state.$current.name).toBe("contacts.item.detail");
      expect(errorLog).toEqual([]);
    });
  });

  describe("option event", () => {
    beforeEach(() => {
      window.location.hash = "";
    });

    it("should bind click event by default", async () => {
      el = $compile("<a ng-state=\"'contacts'\"></a>")($rootScope);
      await wait(100);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "click");
      await wait(100);

      expect($state.current.name).toEqual("contacts");
    });

    it("should bind single HTML events", async () => {
      el = createElementFromHTML(
        '<input type="text" ng-state="\'contacts\'" ng-state-opts="{ events: [\'change\'] }">',
      );
      $compile(el)($rootScope);
      await wait(100);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "change");
      await wait(100);

      expect($state.current.name).toEqual("contacts");
    });

    it("should bind multiple HTML events", async () => {
      el = createElementFromHTML(
        "<input type=\"text\" ng-state=\"'contacts'\" ng-state-opts=\"{ events: ['change', 'blur'] }\">",
      );
      $compile(el)($rootScope);
      await wait(100);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "change");
      await wait(100);
      expect($state.current.name).toEqual("contacts");

      await $state.go("top");
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "blur");
      await wait(100);
      expect($state.current.name).toEqual("contacts");
    });

    it("should bind multiple Mouse events", async () => {
      el = createElementFromHTML(
        "<a ng-state=\"'contacts'\" ng-state-opts=\"{ events: ['mouseover', 'mousedown'] }\">",
      );
      $compile(el)($rootScope);
      await wait(100);
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "mouseover");
      await wait(100);
      expect($state.current.name).toEqual("contacts");

      await $state.go("top");
      expect($state.current.name).toEqual("top");

      browserTrigger(el, "mousedown");
      await wait(100);
      expect($state.current.name).toEqual("contacts");
    });
  });
});

describe("ngStateActive", () => {
  window.location.hash = "";
  let el,
    el2,
    template,
    scope,
    $rootScope,
    $compile,
    $injector,
    $timeout,
    $state,
    stateRuntime;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.location.hash = "";
    window.angular = new Angular();
    const module = window.angular.module("defaultModule", []);

    registerStates(
      module,
      { name: "top", url: "" },
      {
        name: "contacts",
        url: "/contacts",
        template:
          '<a ng-state="\'.item\'" ng-state-params="{ id: 6 }" ng-state-active="active">Contacts</a>',
      },
      { name: "contacts.item", url: "/:id" },
      { name: "contacts.item.detail", url: "/detail/:foo" },
      { name: "contacts.item.edit", url: "/edit" },
      {
        name: "admin",
        url: "/admin",
        abstract: true,
        template: "<ng-view/>",
      },
      { name: "admin.roles", url: "/roles?page" },
      {
        name: "arrayparam",
        url: "/arrayparam?{foo:int}&bar",
        template: "<div></div>",
      },
    );
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);
    $rootScope = $injector.get("$rootScope");
    $compile = $injector.get("$compile");
    $state = $injector.get("$state");
    stateRuntime = $state;
  });

  it("should update class for sibling ng-state", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active="active">Contacts</a><a ng-state="\'contacts.item\'" ng-state-params="{ id: 2 }" ng-state-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
  });

  it("supports data-ng-state-active normalized reads", async () => {
    el = createElementFromHTML(
      '<div><a data-ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" data-ng-state-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");
  });

  it("supports ng-state-active canonical reads", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
  });

  it("supports ng-state-active-exact canonical reads", async () => {
    template = $compile(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active-exact="active">Contacts</a></div>',
    )($rootScope);
    const a = template.getElementsByTagName("a")[0];

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).toMatch(/active/);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).not.toMatch(/active/);
  });

  it("lets parent ng-state-active track child ng-state links", async () => {
    el = createElementFromHTML(
      '<div ng-state-active="active"><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.getAttribute("class")).toBeNull();

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.getAttribute("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(template.getAttribute("class")).toBe("");
  });

  it("supports ng-state-active object definitions", async () => {
    el = $compile(
      "<div ng-state-active=\"{active: 'admin.roles({page: 1})'}\"></div>",
    )($rootScope);

    $state.transitionTo("admin.roles");
    await wait(100);
    expect(el.className).not.toMatch(/active/);

    $state.transitionTo("admin.roles", { page: 1 });
    await wait(100);
    expect(el.className).toMatch(/active/);
  });

  it("should match state's parameters", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'contacts.item.detail\'" ng-state-params="{ foo: \'bar\' }" ng-state-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
    $state.transitionTo("contacts.item.detail", { id: 5, foo: "bar" });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("contacts.item.detail", { id: 5, foo: "baz" });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
  });

  // Test for #2696
  it("should compare using typed parameters", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'arrayparam\'" ng-state-params="{ foo: [1,2,3] }" ng-state-active="active">foo 123</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();

    $state.transitionTo("arrayparam", { foo: [1, 2, 3] });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2, 3], bar: "asdf" });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2] });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
  });

  // Test for #3154
  it("should compare ng-state-active-exact using typed parameters", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'arrayparam\'" ng-state-params="{ foo: [1,2,3] }" ng-state-active-exact="active">foo 123</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();

    $state.transitionTo("arrayparam", { foo: [1, 2, 3] });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2, 3], bar: "asdf" });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("arrayparam", { foo: [1, 2] });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
  });

  it("should update in response to ng-state param expression changes", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'contacts.item.detail\'" ng-state-params="{ foo: fooId }" ng-state-active="active">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    $rootScope.fooId = "bar";
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
    $state.transitionTo("contacts.item.detail", { id: 5, foo: "bar" });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $rootScope.fooId = "baz";
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();
  });

  it("should match on child states", async () => {
    template = $compile(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active="active">Contacts</a></div>',
    )($rootScope);
    const a = template.getElementsByTagName("a")[0];

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect($state.params.id).toBe("1");
    expect(a.getAttribute("class")).toMatch(/active/);

    $state.transitionTo("contacts.item.edit", { id: 4 });
    await wait(100);
    expect($state.params.id).toBe("4");
    expect(a.getAttribute("class")).not.toMatch(/active/);
  });

  it("should NOT match on child states when active-equals is used", async () => {
    template = $compile(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active-exact="active">Contacts</a></div>',
    )($rootScope);
    const a = template.getElementsByTagName("a")[0];

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).toMatch(/active/);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).not.toMatch(/active/);
  });

  it("should match on child states when active-equals and active-equals-eq is used", async () => {
    template = $compile(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active="active" ng-state-active-exact="active-eq">Contacts</a></div>',
    )($rootScope);
    const a = template.getElementsByTagName("a")[0];

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).toMatch(/active/);
    expect(a.getAttribute("class")).toMatch(/active-eq/);

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).toMatch(/active/);
    expect(a.getAttribute("class")).not.toMatch(/active-eq/);
  });

  it("should resolve relative state refs", async () => {
    el = "<section><div ng-view></div></section>";
    template = $compile(el)($rootScope);
    $state.transitionTo("contacts");
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeNull();

    $state.transitionTo("contacts.item", { id: 6 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 5 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("");
  });

  it("should match on any child state refs", async () => {
    el = createElementFromHTML(
      '<div ng-state-active="active"><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }">Contacts</a><a ng-state="\'contacts.item\'" ng-state-params="{ id: 2 }">Contacts</a></div>',
    );
    template = $compile(el)($rootScope);
    expect(template.getAttribute("class")).toBeNull();

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.getAttribute("class")).toBe("active");

    $state.transitionTo("contacts.item", { id: 2 });
    await wait(100);
    expect(template.getAttribute("class")).toBe("active");
  });

  it("should match fuzzy on lazy loaded states", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'contacts.lazy\'" ng-state-active="active">Lazy Contact</a></div>',
    );
    template = $compile(el)($rootScope);
    await wait(100);

    stateRuntime.lazy("contacts.lazy", function () {
      return { name: "contacts.lazy" };
    });

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();

    $state.transitionTo("contacts.lazy");
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");
  });

  it("should match exactly on lazy loaded states", async () => {
    el = createElementFromHTML(
      '<div><a ng-state="\'contacts.lazy\'" ng-state-active-exact="active">Lazy Contact</a></div>',
    );
    template = $compile(el)($rootScope);
    await wait(100);

    stateRuntime.lazy("contacts.lazy", function () {
      return { name: "contacts.lazy" };
    });

    $state.transitionTo("contacts.item", { id: 1 });
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBeFalsy();

    $state.transitionTo("contacts.lazy");
    await wait(100);
    expect(template.querySelector("a").getAttribute("class")).toBe("active");
  });

  it("should allow multiple classes to be supplied", async () => {
    template = $compile(
      '<div><a ng-state="\'contacts.item\'" ng-state-params="{ id: 1 }" ng-state-active="active also-active">Contacts</a></div>',
    )($rootScope);
    const a = template.getElementsByTagName("a")[0];

    $state.transitionTo("contacts.item.edit", { id: 1 });
    await wait(100);
    expect(a.getAttribute("class")).toMatch(/active also-active/);
  });

  describe("ng-{class,style} interface", () => {
    it("should match on abstract states that are included by the current state", async () => {
      el = $compile(
        '<div ng-state-active="{active: \'admin.*\'}"><a ng-state-active="active" ng-state="\'admin.roles\'">Roles</a></div>',
      )($rootScope);
      $state.transitionTo("admin.roles");
      await wait(100);
      const abstractParent = el;

      expect(abstractParent.className).toMatch(/active/);
      const child = el.querySelector("a");

      expect(child.className).toMatch(/active/);
    });

    it("should match on state parameters", async () => {
      el = $compile(
        "<div ng-state-active=\"{active: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el.className).toMatch(/active/);
    });

    it("should shadow the state provided by ng-state", async () => {
      el = $compile(
        "<div ng-state-active=\"{active: 'admin.roles({page: 1})'}\"><a ng-state=\"'admin.roles'\"></a></div>",
      )($rootScope);
      $state.transitionTo("admin.roles");
      await wait(100);
      expect(el.className).not.toMatch(/active/);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el.className).toMatch(/active/);
    });

    it("should support multiple <className, stateOrName> pairs", async () => {
      el = $compile(
        "<div ng-state-active=\"{contacts: 'contacts.**', admin: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("contacts");
      await wait(100);
      expect(el.className).toMatch(/contacts/);
      expect(el.className).not.toMatch(/admin/);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el.className).toMatch(/admin/);
      expect(el.className).not.toMatch(/contacts/);
    });

    it("should update the active classes when compiled", async () => {
      el = $compile("<div ng-state-active=\"{active: 'admin.roles'}\"/>")(
        $rootScope,
      );
      $state.transitionTo("admin.roles");
      await wait(100);
      expect(el.classList.contains("active")).toBeTruthy();
    });
  });

  describe("ng-{class,style} interface, and handle values as arrays", () => {
    it("should match on abstract states that are included by the current state", async () => {
      el = $compile(
        "<div ng-state-active=\"{active: ['randomState.**', 'admin.roles']}\"><a ng-state-active=\"active\" ng-state=\"'admin.roles'\">Roles</a></div>",
      )($rootScope);
      $state.transitionTo("admin.roles");
      await wait(100);
      const abstractParent = el;

      expect(abstractParent.className).toMatch(/active/);
      const child = el.querySelector("a");

      expect(child.className).toMatch(/active/);
    });

    it("should match on state parameters", async () => {
      el = $compile(
        "<div ng-state-active=\"{active: ['admin.roles({page: 1})']}\"></div>",
      )($rootScope);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el.className).toMatch(/active/);
    });

    it("should support multiple <className, stateOrName> pairs", async () => {
      el = $compile(
        "<div ng-state-active=\"{contacts: ['contacts.item', 'contacts.item.detail'], admin: 'admin.roles({page: 1})'}\"></div>",
      )($rootScope);
      $state.transitionTo("contacts.item.detail", { id: 1, foo: "bar" });
      await wait(100);
      expect(el.className).toMatch(/contacts/);
      expect(el.className).not.toMatch(/admin/);
      $state.transitionTo("admin.roles", { page: 1 });
      await wait(100);
      expect(el.className).toMatch(/admin/);
      expect(el.className).not.toMatch(/contacts/);
    });

    it("should update the active classes when compiled", async () => {
      $state.transitionTo("admin.roles");
      await wait(100);
      el = $compile(
        "<div ng-state-active=\"{active: ['admin.roles', 'admin.someOtherState']}\"/>",
      )($rootScope);
      expect(el.classList.contains("active")).toBeTruthy();
    });
  });
});
