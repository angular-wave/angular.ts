// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  createSseRuntimeConfiguration,
  destroySseRuntimeConfiguration,
} from "./sse.ts";

describe("$sse", () => {
  let angular, sse, el, $compile, $scope;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";

    angular = new Angular();

    angular.bootstrap(el, []).invoke([
      "$sse",
      "$compile",
      "$rootScope",
      (_$sse_, _$compile_, _$rootScope_) => {
        sse = _$sse_;
        $compile = _$compile_;
        $scope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    angular._composition.destroy();
    dealoc(el);
  });

  it("should be available as a service", () => {
    expect(sse).toBeDefined();
  });

  it("tears down runtime configuration idempotently", () => {
    const configuration = createSseRuntimeConfiguration();
    const connection = { close: jasmine.createSpy("close") };
    configuration.connections.add(connection);

    destroySseRuntimeConfiguration(configuration);
    destroySseRuntimeConfiguration(configuration);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  it("should close owned connections when the runtime is destroyed", () => {
    const RealEventSource = window.EventSource;
    const sources = [];

    window.EventSource = function () {
      this.closeCalls = 0;
      this.addEventListener = () => undefined;
      this.close = () => this.closeCalls++;
      sources.push(this);
    };

    try {
      sse("/mock/events", { heartbeatTimeout: 0 });
      angular._composition.destroy();

      expect(sources[0].closeCalls).toBe(1);
      expect(() => sse("/mock/events/after-destroy")).toThrowError(
        "Cannot create an SSE connection after runtime teardown",
      );
    } finally {
      window.EventSource = RealEventSource;
    }
  });

  it("should release explicitly closed connections from runtime ownership", () => {
    const RealEventSource = window.EventSource;
    const sources = [];

    window.EventSource = function () {
      this.closeCalls = 0;
      this.addEventListener = () => undefined;
      this.close = () => this.closeCalls++;
      sources.push(this);
    };

    try {
      const source = sse("/mock/events", { heartbeatTimeout: 0 });

      source.close();
      angular._composition.destroy();

      expect(sources[0].closeCalls).toBe(1);
    } finally {
      window.EventSource = RealEventSource;
    }
  });

  it("allows callers to request an explicit reconnect", () => {
    const RealEventSource = window.EventSource;
    const sources = [];

    window.EventSource = function () {
      this.addEventListener = () => undefined;
      this.close = () => undefined;
      sources.push(this);
    };

    try {
      const source = sse("/mock/events", { heartbeatTimeout: 0 });

      source.reconnect();

      expect(sources.length).toBe(2);
      source.close();
    } finally {
      window.EventSource = RealEventSource;
    }
  });

  it("should call onOpen when connection opens", async () => {
    let opened = false;

    const source = sse("/mock/events", {
      onOpen: () => (opened = true),
    });

    await wait(100);
    expect(opened).toBe(true);
    source.close();
  });

  it("should call onMessage for incoming events", async () => {
    const received = [];

    const source = sse("/mock/events", {
      onMessage: (data) => received.push(data),
    });

    await wait(1500);
    expect(received.length).toBeGreaterThan(0);
    source.close();
  });

  it("should expose default messages through onEvent", async () => {
    const received = [];

    const source = sse("/mock/events", {
      onEvent: (message) => received.push(message),
    });

    await wait(1500);
    expect(received.length).toBeGreaterThan(0);
    expect(received[0].type).toBe("message");
    expect(received[0].rawData).toBeDefined();
    source.close();
  });

  it("should transform messages if transformMessage is provided", async () => {
    const transformed = [];

    const source = sse("/mock/events", {
      transformMessage: (data) => ({ wrapped: data }),
      onMessage: (data) => transformed.push(data),
    });

    await wait(1500);
    expect(transformed.length).toBeGreaterThan(0);
    expect(transformed.every((d) => d.wrapped !== undefined)).toBe(true);
    source.close();
  });

  it("should expose registered custom events through onEvent", async () => {
    const RealEventSource = window.EventSource;

    const received = [];

    window.EventSource = function () {
      this.listeners = {};
      this.addEventListener = (type, fn) => {
        this.listeners[type] = fn;
      };
      this.close = () => {
        /* empty */
      };
      setTimeout(() => {
        this.listeners.open?.({ type: "open" });
        this.listeners.notice?.({
          type: "notice",
          data: '{"ok":true}',
        });
      }, 10);
    };

    const source = sse("/mock/events", {
      eventTypes: ["notice"],
      onEvent: (message) => received.push(message),
    });

    await wait(50);
    expect(received.length).toBe(1);
    expect(received[0].type).toBe("notice");
    expect(received[0].data).toEqual({ ok: true });

    source.close();
    window.EventSource = RealEventSource;
  });

  it("should build URL with query params", () => {
    const RealEventSource = window.EventSource;
    let builtUrl = "";

    window.EventSource = function (url) {
      builtUrl = url;
      this.addEventListener = () => undefined;
      this.close = () => undefined;
    };

    try {
      const source = sse("/mock/events", { params: { a: 1, b: "x" } });

      expect(builtUrl).toContain("a=1");
      expect(builtUrl).toContain("b=x");
      source.close();

      const querySource = sse("/mock/events?existing=true", {
        params: { page: 2 },
      });

      expect(builtUrl).toContain("existing=true&page=2");
      querySource.close();
    } finally {
      window.EventSource = RealEventSource;
    }
  });

  it("serializes all supported SSE query parameter types", async () => {
    let builtUrl = "";

    const RealEventSource = window.EventSource;

    window.EventSource = function (url) {
      builtUrl = url;

      this.listeners = {};
      this.addEventListener = () => {
        /* empty */
      };
      this.close = () => {
        /* empty */
      };
    };

    const source = sse("/mock/events", {
      params: {
        name: "alpha",
        count: 3,
        active: false,
        none: undefined,
        missing: null,
        payload: { x: 1 },
        fn: () => "value",
        huge: 12n,
      },
    });

    await wait(20);

    expect(builtUrl).toContain("/mock/events?");
    expect(builtUrl).toContain("name=alpha");
    expect(builtUrl).toContain("count=3");
    expect(builtUrl).toContain("active=false");
    expect(builtUrl).toContain("none=");
    expect(builtUrl).toContain("missing=");
    expect(builtUrl).toContain("payload=%7B%22x%22%3A1%7D");
    expect(builtUrl).toContain("fn=undefined");
    expect(builtUrl).toContain("huge=12");

    source.close();
    window.EventSource = RealEventSource;
  });

  it("should trigger onError when EventSource fails", async () => {
    let errored = false;

    // Simple in-place mock EventSource that calls error immediately
    const RealEventSource = window.EventSource;

    window.EventSource = function () {
      this.addEventListener = (t, fn) => {
        if (t === "error") setTimeout(() => fn(new Error("mock error")), 10);
      };
      this.close = () => {
        /* empty */
      };
    };

    const source = sse("/mock/events", {
      onError: () => (errored = true),
    });

    await wait(50);
    expect(errored).toBe(true);
    source.close();

    window.EventSource = RealEventSource;
  });

  it("should reconnect after heartbeat timeout", async () => {
    let reconnects = 0;

    const RealEventSource = window.EventSource;

    // We'll simulate multiple EventSource creations
    let instanceCount = 0;

    function MockEventSource() {
      instanceCount++;
      this.listeners = {};
      this.addEventListener = (type, fn) => {
        this.listeners[type] = fn;
      };
      this.close = () => {
        /* empty */
      };
      // simulate an 'open' event
      setTimeout(() => this.listeners.open && this.listeners.open({}), 10);
    }

    window.EventSource = MockEventSource;

    const source = sse("/mock/events", {
      heartbeatTimeout: 20,
      maxRetries: 1,
      retryDelay: 5,
      onReconnect: () => reconnects++,
    });

    await wait(50);

    // after one open + one reconnect, there should be ≥ 2 EventSource instances
    expect(instanceCount).toBeGreaterThanOrEqual(2);
    expect(reconnects).toBeGreaterThanOrEqual(1);

    source.close();
    window.EventSource = RealEventSource;
  });

  it("should apply app configured defaults when opening runtime connections", async () => {
    const configuredEl = document.createElement("div");
    const configuredAngular = new Angular();
    const RealEventSource = window.EventSource;
    const openedSources = [];
    const received = [];
    let configuredSse;

    document.body.appendChild(configuredEl);

    window.EventSource = function (url, options) {
      this.url = url;
      this.options = options;
      this.listeners = {};
      this.addEventListener = (type, fn) => {
        this.listeners[type] = fn;
      };
      this.close = () => {
        /* empty */
      };
      openedSources.push(this);
      setTimeout(() => this.listeners.open?.({ type: "open" }), 0);
    };

    try {
      configuredAngular.module("configuredSseDefaults", []).config({
        $sse: {
          defaults: {
            heartbeatTimeout: 0,
            params: {
              configured: true,
            },
            retryDelay: 5,
            transformMessage(data) {
              return { configured: data };
            },
            withCredentials: true,
          },
        },
      });

      configuredAngular
        .bootstrap(configuredEl, ["configuredSseDefaults"])
        .invoke([
          "$sse",
          (_$sse_) => {
            configuredSse = _$sse_;
          },
        ]);

      const source = configuredSse("/configured/events", {
        onMessage: (message) => received.push(message),
      });

      await wait(10);

      openedSources[0].listeners.message({
        type: "message",
        data: "payload",
      });

      expect(openedSources[0].url).toContain("/configured/events?");
      expect(openedSources[0].url).toContain("configured=true");
      expect(openedSources[0].options).toEqual({ withCredentials: true });
      expect(received).toEqual([{ configured: "payload" }]);

      const localSource = configuredSse("/local/events", {
        params: {
          local: "yes",
        },
        transformMessage(data) {
          return { local: data };
        },
        withCredentials: false,
        onMessage: (message) => received.push(message),
      });

      await wait(10);

      openedSources[1].listeners.message({
        type: "message",
        data: "override",
      });

      expect(openedSources[1].url).toContain("local=yes");
      expect(openedSources[1].url).not.toContain("configured=true");
      expect(openedSources[1].options).toEqual({ withCredentials: false });
      expect(received[1]).toEqual({ local: "override" });

      source.close();
      localSource.close();
    } finally {
      configuredAngular._composition.destroy();
      window.EventSource = RealEventSource;
      dealoc(configuredEl);
    }
  });

  it("should close the connection cleanly", async () => {
    let messageCount = 0;

    const source = sse("/mock/events", {
      onMessage: () => messageCount++,
    });

    await wait(500);
    source.close();

    const before = messageCount;

    await wait(1000);
    expect(messageCount).toBe(before);
  });

  it("should apply realtime protocol html messages in ng-sse", async () => {
    const restore = mockEventSource([{ html: "<span>Live</span>" }]);

    try {
      const node = compileDirective(
        '<div ng-sse="/mock/events" trigger="connect"></div>',
      );

      node.dispatchEvent(new Event("connect"));

      await wait(50);
      expect(node.innerHTML).toBe("<span>Live</span>");
    } finally {
      restore();
    }
  });

  it("should apply realtime protocol target and swap overrides in ng-sse", async () => {
    const restore = mockEventSource([
      { html: "<li>Second</li>", target: "#items", swap: "beforeend" },
    ]);

    try {
      const host = compileDirective(`
        <section>
          <ul id="items"><li>First</li></ul>
          <div ng-sse="/mock/events" trigger="connect"></div>
        </section>
      `);

      host.querySelector("[ng-sse]").dispatchEvent(new Event("connect"));

      await wait(50);
      expect(el.querySelector("#items").textContent).toBe("FirstSecond");
    } finally {
      restore();
    }
  });

  it("should apply realtime protocol textContent messages in ng-sse", async () => {
    const restore = mockEventSource([{ data: "Ready", swap: "textContent" }]);

    try {
      const node = compileDirective(
        '<div ng-sse="/mock/events" trigger="connect"></div>',
      );

      node.dispatchEvent(new Event("connect"));

      await wait(50);
      expect(node.textContent).toBe("Ready");
    } finally {
      restore();
    }
  });

  function compileDirective(template) {
    const node = $compile(template.trim())($scope);

    el.appendChild(node);

    return node;
  }

  function mockEventSource(messages) {
    const RealEventSource = window.EventSource;

    window.EventSource = function () {
      this.listeners = {};
      this.addEventListener = (type, fn) => {
        this.listeners[type] = fn;
      };
      this.close = () => {
        /* empty */
      };
      setTimeout(() => {
        this.listeners.open?.({ type: "open" });
        messages.forEach((message) => {
          this.listeners.message?.({
            type: "message",
            data: JSON.stringify(message),
          });
        });
      }, 10);
    };

    return () => {
      window.EventSource = RealEventSource;
    };
  }
});
