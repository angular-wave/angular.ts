// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc, getScope } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  createWebComponentRuntimeState,
  createWebComponentService,
  destroyWebComponentRuntimeState,
  ScopeElement,
} from "./web-component.ts";

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

    angular.module(moduleName, []).appComponent(tagName, {
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

    angular.bootstrap(app, [moduleName]).invoke([
      "$rootScope",
      (_$rootScope_) => {
        rootScope = _$rootScope_;
        rootScope.shared = "root";
      },
    ]);

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

    await wait();

    expect(element.shadowRoot.textContent).toContain("bye/next/3/false/ready");
  });

  it("supports service-level element scopes for hand-written elements", () => {
    const angular = new Angular();

    const host = document.createElement("section");

    app.appendChild(host);

    angular.bootstrap(app, []).invoke([
      "$webComponent",
      "$rootScope",
      ($webComponent, $rootScope) => {
        const scope = $webComponent.createElementScope(host, {
          title: "manual",
        });

        expect(scope.title).toBe("manual");
        expect(scope.$parent.$id).toBe($rootScope.$id);
        expect(getScope(host)).toBe(scope);
      },
    ]);
  });

  it("creates detached isolate element scopes with the root as parent", () => {
    const angular = new Angular();

    angular.bootstrap(app, []).invoke([
      "$webComponent",
      "$rootScope",
      ($webComponent, $rootScope) => {
        const host = document.createElement("section");
        const scope = $webComponent.createElementScope(
          host,
          { title: "isolated" },
          { isolate: true },
        );

        expect(scope.title).toBe("isolated");
        expect(scope.$parent.$id).toBe($rootScope.$id);
      },
    ]);
  });

  it("applies typed app-wide defaults to app components", async () => {
    const tagName = nextTagName("default-shadow-card");
    const moduleName = nextModuleName();
    const angular = new Angular();

    angular
      .module(moduleName, [])
      .config({
        $webComponent: {
          defaults: {
            shadow: true,
          },
        },
      })
      .appComponent(tagName, {
        scope: { title: "configured" },
        template: "<span>{{title}}</span>",
      });

    angular.bootstrap(app, [moduleName]);

    const element = document.createElement(tagName);

    app.appendChild(element);
    await wait();
    await wait();

    expect(element.shadowRoot?.textContent).toContain("configured");
  });

  it("releases runtime-owned custom element state during teardown", async () => {
    const tagName = nextTagName("runtime-owned-card");
    const angular = new Angular();
    let injector;
    let rootScope;
    let compile;

    angular.bootstrap(app, []).invoke([
      "$injector",
      "$rootScope",
      "$compile",
      (_$injector_, _$rootScope_, _$compile_) => {
        injector = _$injector_;
        rootScope = _$rootScope_;
        compile = _$compile_;
      },
    ]);

    const state = createWebComponentRuntimeState();
    const service = createWebComponentService(
      injector,
      rootScope,
      compile,
      state,
    );
    const events = [];

    service.defineAppComponent(tagName, {
      shadow: true,
      inputs: { title: String },
      template: "<span>runtime owned</span>",
      connected() {
        return () => events.push("cleanup");
      },
      disconnected() {
        events.push("disconnected");
      },
    });

    const element = document.createElement(tagName);

    app.appendChild(element);
    await wait();
    await wait();

    const scope = getScope(element);

    destroyWebComponentRuntimeState(state);
    destroyWebComponentRuntimeState(state);

    expect(events).toEqual(["cleanup", "disconnected"]);
    expect(scope.$handler._destroyed).toBeTrue();
    expect(element.shadowRoot.textContent).toBe("");
    expect(() =>
      service.createElementScope(document.createElement("div")),
    ).toThrowError("Cannot use $webComponent after runtime teardown");

    element.setAttribute("title", "stale");
    element.remove();
    app.appendChild(element);
    await wait();

    expect(element.scope).toBe(scope);
    expect(state.hosts.has(element)).toBeFalse();
  });

  it("cancels pending disconnect teardown during runtime destruction", async () => {
    const tagName = nextTagName("pending-destroy-card");
    const angular = new Angular();
    let injector;
    let rootScope;
    let compile;

    angular.bootstrap(app, []).invoke([
      "$injector",
      "$rootScope",
      "$compile",
      (_$injector_, _$rootScope_, _$compile_) => {
        injector = _$injector_;
        rootScope = _$rootScope_;
        compile = _$compile_;
      },
    ]);

    const state = createWebComponentRuntimeState();
    const service = createWebComponentService(
      injector,
      rootScope,
      compile,
      state,
    );

    service.defineAppComponent(tagName, { template: "ready" });
    const element = document.createElement(tagName);
    app.appendChild(element);
    await wait();

    element.remove();
    destroyWebComponentRuntimeState(state);

    expect(state.hosts.size).toBe(0);
  });

  it("ignores scopes that were already destroyed during runtime teardown", () => {
    const state = createWebComponentRuntimeState();
    const destroyedScope = { $handler: { _destroyed: true } };
    state.scopes.add(destroyedScope);

    destroyWebComponentRuntimeState(state);

    expect(state.scopes.size).toBe(0);
  });

  it("destroys active scopes that are not connected to a host", () => {
    const state = createWebComponentRuntimeState();
    const scope = {
      $handler: { _destroyed: false },
      $destroy: jasmine.createSpy("$destroy"),
    };

    state.scopes.add(scope);
    destroyWebComponentRuntimeState(state);

    expect(scope.$destroy).toHaveBeenCalledOnceWith();
  });

  it("destroys the owned scope after disconnect", async () => {
    const tagName = nextTagName("destroy-card");

    const moduleName = nextModuleName();

    const angular = new Angular();

    const events = [];

    angular.module(moduleName, []).appComponent(tagName, {
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

    angular.module(moduleName, []).appComponent(tagName, {
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

  it("registers user-authored ScopeElement custom elements", async () => {
    const tagName = nextTagName("scope-element-card");

    const moduleName = nextModuleName();

    const angular = new Angular();

    const events = [];

    class StatusCard extends ScopeElement {
      static shadow = true;
      static inputs = {
        title: String,
      };
      static scope = {
        count: 1,
      };
      static template = `
        <button ng-click="increment()">
          {{title}}/{{count}}/{{label}}
        </button>
      `;

      connected() {
        this.scope.label = this.injector.get("labelService").value;
        this.scope.increment = () => {
          this.scope.count++;
          this.dispatch("count-change", { count: this.scope.count });
        };
      }

      disconnected() {
        events.push("disconnected");
      }
    }

    class LabelService {
      value = "ready";
    }

    angular
      .module(moduleName, [])
      .service("labelService", LabelService)
      .webComponent(tagName, StatusCard);

    angular.bootstrap(app, [moduleName]);

    const element = document.createElement(tagName);

    element.title = "Native";
    element.addEventListener("count-change", (event) => {
      events.push(event.detail.count);
    });
    app.appendChild(element);

    await wait();
    await wait();

    expect(element instanceof StatusCard).toBe(true);
    expect(element.scope).toBe(getScope(element));
    expect(element.injector.get("labelService").value).toBe("ready");
    expect(element.shadowRoot.textContent).toContain("Native/1/ready");

    element.shadowRoot.querySelector("button").click();

    await wait();

    expect(events).toEqual([2]);
    expect(element.shadowRoot.textContent).toContain("Native/2/ready");

    element.remove();

    await wait(10);

    expect(events).toEqual([2, "disconnected"]);
  });

  it("lets ScopeElement children inherit parent scopes across shadow DOM", async () => {
    const parentTagName = nextTagName("scope-parent");
    const childTagName = nextTagName("scope-child");

    const moduleName = nextModuleName();

    const angular = new Angular();

    class ChildElement extends ScopeElement {
      static shadow = true;
      static inputs = {
        index: Number,
      };
      static template = `<span>{{items[index]}}</span>`;
    }

    class ParentElement extends ScopeElement {
      static shadow = true;
      static scope = {
        items: ["ready"],
      };
      static template = `<${childTagName} index="0"></${childTagName}>`;
    }

    angular
      .module(moduleName, [])
      .webComponent(childTagName, ChildElement)
      .webComponent(parentTagName, ParentElement);

    angular.bootstrap(app, [moduleName]);

    const element = document.createElement(parentTagName);

    app.appendChild(element);

    await wait();
    await wait();

    const child = element.shadowRoot.querySelector(childTagName);

    expect(child.scope.$parent.$id).toBe(element.scope.$id);
    expect(child.shadowRoot.textContent).toContain("ready");
  });

  it("supports declarative property and custom event bindings between ScopeElements", async () => {
    const parentTagName = nextTagName("binding-parent");
    const childTagName = nextTagName("binding-child");

    const moduleName = nextModuleName();

    const angular = new Angular();

    class ChildElement extends ScopeElement {
      static shadow = true;
      static inputs = {
        value: String,
      };
      static template = `<button ng-click="select()">{{value}}</button>`;

      connected() {
        this.scope.select = () => {
          this.dispatch("child-select", {
            value: `${this.scope.value}!`,
          });
        };
      }
    }

    class ParentElement extends ScopeElement {
      static shadow = true;
      static scope = {
        value: "ready",
      };
      static template = `
        <${childTagName}
          ng-prop-value="value"
          ng-on-child-select="value = $event.detail.value"
        ></${childTagName}>
      `;
    }

    angular
      .module(moduleName, [])
      .webComponent(childTagName, ChildElement)
      .webComponent(parentTagName, ParentElement);

    angular.bootstrap(app, [moduleName]);

    const element = document.createElement(parentTagName);

    app.appendChild(element);

    await wait();
    await wait();

    const child = element.shadowRoot.querySelector(childTagName);

    expect(child.shadowRoot.textContent).toContain("ready");

    element.scope.value = "updated";

    await wait();

    expect(child.shadowRoot.textContent).toContain("updated");

    child.shadowRoot.querySelector("button").click();

    await wait();

    expect(element.scope.value).toBe("updated!");
    expect(child.shadowRoot.textContent).toContain("updated!");
  });
});

function nextTagName(prefix) {
  return `x-${prefix}-${++nextId}`;
}

function nextModuleName() {
  return `webComponentTest${nextId}`;
}
