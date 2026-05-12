// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";

describe("$native", () => {
  let el, $animate, $compile, $native, $rootScope;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";

    delete window.AngularNative;
    delete window.angularNative;

    const angular = new Angular();

    angular
      .bootstrap(el, [])
      .invoke((_$animate_, _$compile_, _$native_, _$rootScope_) => {
        $animate = _$animate_;
        $compile = _$compile_;
        $native = _$native_;
        $rootScope = _$rootScope_;
      });
  });

  afterEach(() => {
    delete window.AngularNative;
    delete window.angularNative;
    dealoc(el);
  });

  it("sends native calls and resolves replies", async () => {
    let sent;

    window.AngularNative = {
      receive(message) {
        sent = JSON.parse(message);
        window.angularNative.receive({
          id: sent.id,
          ok: true,
          result: { shared: true },
        });
      },
    };

    const result = await $native.call("share", "open", { title: "Demo" });

    expect(sent.target).toBe("share");
    expect(sent.method).toBe("open");
    expect(sent.params.title).toBe("Demo");
    expect(result).toEqual({ shared: true });
  });

  it("evaluates ng-native result expressions", async () => {
    let sent;

    window.AngularNative = {
      receive(message) {
        sent = JSON.parse(message);
        window.angularNative.receive({
          id: sent.id,
          ok: true,
          result: { uri: "content://photo.jpg" },
        });
      },
    };

    const scope = $rootScope.$new();

    scope.quality = 0.8;
    const node = compile(
      scope,
      `<button
        ng-native="camera"
        data-event="pickPhoto"
        data-params="{ quality: quality }"
        data-on-result="photo = $result"
      ></button>`,
    );

    browserTrigger(node, "click");
    await wait(25);

    expect(sent.scopeId).toBe(scope.$id);
    expect(scope.photo.uri).toBe("content://photo.jpg");
  });

  it("uses animated realtime swaps from native replies", async () => {
    window.AngularNative = {
      receive(message) {
        const call = JSON.parse(message);

        window.angularNative.receive({
          id: call.id,
          ok: true,
          result: {
            target: "#feed",
            swap: "beforeend",
            html: "<article>Native patch</article>",
          },
        });
      },
    };

    const scope = $rootScope.$new();

    compile(scope, `<section id="feed"></section>`);
    const button = compile(
      scope,
      `<button ng-native="feed" animate="true"></button>`,
    );

    spyOn($animate, "enter").and.callThrough();
    browserTrigger(button, "click");
    await wait(25);

    expect(el.querySelector("#feed").textContent).toBe("Native patch");
    expect($animate.enter).toHaveBeenCalled();
  });

  it("mounts, updates, and unmounts native components", async () => {
    const calls = [];

    window.AngularNative = {
      receive(message) {
        const call = JSON.parse(message);

        calls.push(call);
        if (call.method === "unmount") {
          window.angularNative.receive({
            id: call.id,
            ok: true,
            result: { ok: true },
          });

          return;
        }

        window.angularNative.receive({
          id: call.id,
          ok: true,
          result: {
            target: `#${call.params.id}`,
            swap: "innerHTML",
            html: `<strong>${call.params.props.text}</strong>`,
          },
        });
      },
    };

    const scope = $rootScope.$new();

    scope.label = "Native hello";
    const node = compile(
      scope,
      `<div
        style="width: 160px; min-height: 48px"
        ng-native-component="hello"
        data-props="{ text: label }"
      ></div>`,
    );

    await wait(50);

    expect(calls[0].target).toBe("component");
    expect(calls[0].method).toBe("mount");
    expect(calls[0].params.name).toBe("hello");
    expect(calls[0].params.rect.width).toBeGreaterThan(0);
    expect(node.textContent).toBe("Native hello");

    scope.label = "Updated native hello";
    scope.$flushQueue();
    await wait(50);

    expect(calls.some((call) => call.method === "update")).toBeTrue();
    expect(node.textContent).toBe("Updated native hello");

    scope.$destroy();
    await wait(25);

    expect(calls.some((call) => call.method === "unmount")).toBeTrue();
  });

  it("handles click events from native components", async () => {
    window.AngularNative = {
      receive(message) {
        const call = JSON.parse(message);

        window.angularNative.receive({
          id: call.id,
          ok: true,
          result: { mounted: true },
        });
      },
    };

    const scope = $rootScope.$new();

    scope.count = 0;
    compile(
      scope,
      `<div
        ng-native-component="material-button"
        data-props="{ text: 'Refresh' }"
        data-on-click="count = count + 1"
      ></div>`,
    );

    await wait(50);

    window.angularNative.dispatch({
      target: "component",
      event: "click",
      data: { id: el.querySelector("[data-native-component-host]").id },
    });

    await wait(25);

    expect(scope.count).toBe(1);
  });

  it("subscribes to native events", async () => {
    const scope = $rootScope.$new();

    const node = compile(
      scope,
      `<div
        ng-native-event="network.status"
        data-on-event="network = $data"
      ></div>`,
    );

    window.angularNative.dispatch({
      target: "network",
      event: "status",
      data: { online: false },
    });

    await wait(25);

    expect(scope.network.online).toBe(false);
    expect(node).toBeDefined();
  });

  function compile(scope, template) {
    const node = $compile(template.trim())(scope);

    el.appendChild(node);

    return node;
  }
});
