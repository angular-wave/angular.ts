// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc, getScope } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

let nextId = 0;

describe("$webComponent", () => {
  let app;

  beforeEach(() => {
    app = document.getElementById("app");
    app.innerHTML = "";
  });

  afterEach(() => {
    dealoc(app);
  });

  it("creates scoped custom elements that inherit parent scope", async () => {
    const tagName = nextTagName("scope-card");

    const moduleName = nextModuleName();

    const angular = new Angular();

    let rootScope;

    angular.module(moduleName, []).webComponent(tagName, {
      shadow: true,
      scope: {
        local: "ready",
      },
      inputs: {
        active: Boolean,
        count: Number,
        title: String,
      },
      template: "<p>{{title}}/{{shared}}/{{count}}/{{active}}/{{local}}</p>",
    });

    angular.bootstrap(app, [moduleName]).invoke((_$rootScope_) => {
      rootScope = _$rootScope_;
      rootScope.shared = "root";
    });

    const element = document.createElement(tagName);

    element.setAttribute("active", "");
    element.setAttribute("count", "2");
    element.setAttribute("title", "hello");
    app.appendChild(element);

    await wait();
    await wait();

    const elementScope = getScope(element);

    expect(elementScope.$parent.$id).toBe(rootScope.$id);
    expect(element.shadowRoot.textContent).toContain("hello/root/2/true/ready");

    element.title = "bye";
    element.count = 3;
    element.active = false;

    await wait();

    expect(element.shadowRoot.textContent).toContain("bye/root/3/false/ready");

    rootScope.shared = "next";
    rootScope.$flushQueue();

    await wait();

    expect(element.shadowRoot.textContent).toContain("bye/next/3/false/ready");
  });

  it("supports service-level element scopes for hand-written elements", () => {
    const angular = new Angular();

    const host = document.createElement("section");

    app.appendChild(host);

    angular.bootstrap(app, []).invoke(($webComponent, $rootScope) => {
      const scope = $webComponent.createElementScope(host, {
        title: "manual",
      });

      expect(scope.title).toBe("manual");
      expect(scope.$parent.$id).toBe($rootScope.$id);
      expect(getScope(host)).toBe(scope);
    });
  });

  it("destroys the owned scope after disconnect", async () => {
    const tagName = nextTagName("destroy-card");

    const moduleName = nextModuleName();

    const angular = new Angular();

    const events = [];

    angular.module(moduleName, []).webComponent(tagName, {
      scope: {
        title: "cleanup",
      },
      template: "<span>{{title}}</span>",
      connected({ scope }) {
        scope.$on("$destroy", () => {
          events.push("destroy");
        });

        return () => {
          events.push("cleanup");
        };
      },
      disconnected() {
        events.push("disconnected");
      },
    });

    angular.bootstrap(app, [moduleName]);

    const element = document.createElement(tagName);

    app.appendChild(element);

    await wait();
    await wait();

    const scope = getScope(element);

    expect(scope.$handler._destroyed).toBe(false);

    element.remove();

    await wait(10);

    expect(events).toEqual(["cleanup", "disconnected", "destroy"]);
    expect(scope.$handler._destroyed).toBe(true);
  });

  it("dispatches native DOM events from scoped components", async () => {
    const tagName = nextTagName("event-card");

    const moduleName = nextModuleName();

    const angular = new Angular();

    const events = [];

    angular.module(moduleName, []).webComponent(tagName, {
      shadow: true,
      scope: {
        title: "eventful",
      },
      template: `<button ng-click="publish()">{{title}}</button>`,
      connected({ dispatch, scope }) {
        scope.publish = () => {
          dispatch("card-select", { title: scope.title });
        };
      },
    });

    angular.bootstrap(app, [moduleName]);

    const element = document.createElement(tagName);

    element.addEventListener("card-select", (event) => {
      events.push(event.detail.title);
    });

    app.appendChild(element);

    await wait();
    await wait();

    element.shadowRoot.querySelector("button").click();

    await wait();

    expect(events).toEqual(["eventful"]);
  });
});

function nextTagName(prefix) {
  return `x-${prefix}-${++nextId}`;
}

function nextModuleName() {
  return `webComponentTest${nextId}`;
}
