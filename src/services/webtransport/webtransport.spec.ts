// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  createWebTransportRuntimeConfiguration,
  destroyWebTransportRuntimeConfiguration,
} from "./webtransport.ts";

const decoder = new TextDecoder();

const encoder = new TextEncoder();

describe("$webTransport", () => {
  let angular, webTransport, el;

  const connections = [];

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";

    angular = new Angular();

    angular.bootstrap(el, []).invoke([
      "$webTransport",
      (_$webTransport_) => {
        webTransport = _$webTransport_;
      },
    ]);
  });

  afterEach(() => {
    connections.splice(0).forEach((connection) => connection.close());
    angular._composition.destroy();
    dealoc(el);
  });

  it("should be available as a service", () => {
    expect(webTransport).toBeDefined();
  });

  it("allows runtime configuration teardown to be repeated", () => {
    const configuration = createWebTransportRuntimeConfiguration();
    const connection = { close: jasmine.createSpy("close") };
    configuration.connections.add(connection);

    destroyWebTransportRuntimeConfiguration(configuration);
    destroyWebTransportRuntimeConfiguration(configuration);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  it("closes owned connections when the runtime is destroyed", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebTransport",
    );
    const instances = [];

    class MockWebTransport {
      constructor() {
        this.closeCalls = 0;
        this.ready = Promise.resolve();
        this.closed = new Promise((resolve) => {
          this.resolveClosed = resolve;
        });
        this.datagrams = {
          readable: new ReadableStream(),
          writable: new WritableStream(),
        };
        instances.push(this);
      }

      close() {
        this.closeCalls++;
        this.resolveClosed();
      }
    }

    try {
      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: MockWebTransport,
      });

      const connection = webTransport("https://localhost:4433/runtime-owned");

      await connection.ready;
      angular._composition.destroy();
      await connection.closed;

      expect(instances[0].closeCalls).toBe(1);
      expect(() =>
        webTransport("https://localhost:4433/after-destroy"),
      ).toThrowError(
        "Cannot create a WebTransport connection after runtime teardown",
      );
    } finally {
      restoreWebTransport(descriptor);
    }
  });

  it("does not close explicitly closed connections twice", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebTransport",
    );
    const instances = [];

    class MockWebTransport {
      constructor() {
        this.closeCalls = 0;
        this.ready = Promise.resolve();
        this.closed = new Promise((resolve) => {
          this.resolveClosed = resolve;
        });
        this.datagrams = {
          readable: new ReadableStream(),
          writable: new WritableStream(),
        };
        instances.push(this);
      }

      close() {
        this.closeCalls++;
        this.resolveClosed();
      }
    }

    try {
      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: MockWebTransport,
      });

      const connection = webTransport("https://localhost:4433/user-closed");

      await connection.ready;
      connection.close();
      await connection.closed;
      angular._composition.destroy();

      expect(instances[0].closeCalls).toBe(1);
    } finally {
      restoreWebTransport(descriptor);
    }
  });

  it("connects to the Go WebTransport backend and echoes datagrams", async () => {
    const messages = [];

    const { url, config } = await webTransportTestConfig({
      onDatagram: ({ message }) => messages.push(message),
      transformDatagram: decode,
    });

    const connection = track(webTransport(url, config));

    await connection.ready;
    await connection.sendDatagram("datagram:hello");
    await eventually(() => messages.includes("datagram:hello"));
    expect(messages).toContain("datagram:hello");
  });

  it("sends text datagrams", async () => {
    const messages = [];

    const { url, config } = await webTransportTestConfig({
      onDatagram: ({ message }) => messages.push(message),
      transformDatagram: decode,
    });

    const connection = track(webTransport(url, config));

    await connection.ready;
    await connection.sendText("text:hello");
    await eventually(() => messages.includes("text:hello"));
    expect(messages).toContain("text:hello");
  });

  it("reports realtime protocol datagrams", async () => {
    const protocolMessages = [];

    const datagrams = [];

    const { url, config } = await webTransportTestConfig({
      onProtocolMessage: (message) => protocolMessages.push(message),
      onDatagram: ({ message }) => datagrams.push(message),
      transformDatagram: (data) => JSON.parse(decode(data)),
    });

    const connection = track(webTransport(url, config));

    await connection.ready;
    await connection.sendText(
      JSON.stringify({
        html: "<strong>Live</strong>",
        target: "#feed",
      }),
    );
    await eventually(() => protocolMessages.length === 1);

    expect(protocolMessages[0].target).toBe("#feed");
    expect(datagrams.length).toBe(1);
  });

  it("sends reliable unidirectional streams", async () => {
    const messages = [];

    const { url, config } = await webTransportTestConfig({
      onDatagram: ({ message }) => messages.push(message),
      transformDatagram: decode,
    });

    const connection = track(webTransport(url, config));

    await connection.ready;
    await connection.sendStream("stream:hello");
    await eventually(() => messages.includes("uni:stream:hello"));
    expect(messages).toContain("uni:stream:hello");
  });

  it("opens reliable bidirectional streams", async () => {
    const { url, config } = await webTransportTestConfig();

    const connection = track(webTransport(url, config));

    await connection.ready;

    const stream = await connection.createBidirectionalStream();

    const writer = stream.writable.getWriter();

    await writer.write(encoder.encode("bidi:hello"));
    await writer.close();
    writer.releaseLock();

    expect(await readText(stream.readable)).toBe("bidi:bidi:hello");
  });

  it("reports open and close lifecycle callbacks", async () => {
    let opened = false;

    let closed = false;

    const { url, config } = await webTransportTestConfig({
      onOpen: () => {
        opened = true;
      },
      onClose: () => {
        closed = true;
      },
    });

    const connection = track(webTransport(url, config));

    await connection.ready;
    expect(opened).toBe(true);

    connection.close();
    await connection.closed;

    expect(closed).toBe(true);
  });

  it("reconnects and lets the renegotiation hook send session state", async () => {
    const token = `renegotiate-${Date.now()}-${Math.random()}`;

    const attempts = [];

    const messages = [];

    const { url, config } = await webTransportTestConfig({
      maxRetries: 1,
      reconnect: true,
      retryDelay: 10,
      onDatagram: ({ message }) => messages.push(message),
      onReconnect: async ({ attempt, connection }) => {
        attempts.push(attempt);
        await connection.sendText(`renegotiated:${token}`);
      },
      transformDatagram: decode,
    });

    const connection = track(
      webTransport(
        `${url}?close=once&token=${encodeURIComponent(token)}`,
        config,
      ),
    );

    await connection.ready;
    await eventually(() => attempts.includes(1), 3000);
    await eventually(() => messages.includes(`renegotiated:${token}`), 3000);

    expect(attempts).toContain(1);
    expect(messages).toContain(`renegotiated:${token}`);
  });

  it("does not reconnect after an explicit close", async () => {
    let closed = false;

    let reconnects = 0;

    const { url, config } = await webTransportTestConfig({
      maxRetries: 1,
      reconnect: true,
      retryDelay: 10,
      onClose: () => {
        closed = true;
      },
      onReconnect: () => {
        reconnects++;
      },
    });

    const connection = track(webTransport(url, config));

    await connection.ready;
    connection.close();
    await connection.closed;
    await wait(50);

    expect(closed).toBe(true);
    expect(reconnects).toBe(0);
  });

  it("rejects non-HTTPS URLs before opening a browser connection", () => {
    expect(() =>
      webTransport("http://localhost:4433/webtransport"),
    ).toThrowError(/must use https/);
  });

  it("rejects URLs without an explicit port", () => {
    expect(() => webTransport("https://localhost/webtransport")).toThrowError(
      /explicit port/,
    );
  });

  it("normalizes constructor failures", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebTransport",
    );
    const thrownError = new Error("native open failed");

    try {
      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: class {
          constructor() {
            throw thrownError;
          }
        },
      });

      const failedWithError = webTransport("https://localhost:4433/fail");
      let readyError;

      try {
        await failedWithError.ready;
      } catch (error) {
        readyError = error;
      }

      expect(readyError).toBe(thrownError);
      await failedWithError.closed.catch(() => undefined);

      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: class {
          constructor() {
            throw "native open failed";
          }
        },
      });

      const failedWithValue = webTransport("https://localhost:4433/fail");
      let wrappedError;

      try {
        await failedWithValue.ready;
      } catch (error) {
        wrappedError = error;
      }

      expect(wrappedError).toEqual(jasmine.any(Error));
      expect(wrappedError.message).toBe("Failed to open WebTransport");
      expect(wrappedError.cause).toBe("native open failed");
      await failedWithValue.closed.catch(() => undefined);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "WebTransport", descriptor);
      } else {
        delete globalThis.WebTransport;
      }
    }
  });

  it("reconnects with a deterministic fake native transport", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebTransport",
    );
    const attempts = [];
    const instances = [];

    class MockWebTransport {
      constructor(url, options) {
        this.url = url;
        this.options = options;
        this.ready = Promise.resolve();
        this.closed = new Promise((resolve) => {
          this.resolveClosed = resolve;
        });
        this.datagrams = {
          readable: new ReadableStream(),
          writable: new WritableStream(),
        };
        instances.push(this);
      }

      close() {
        this.resolveClosed();
      }

      createBidirectionalStream() {
        return Promise.resolve({
          readable: new ReadableStream(),
          writable: new WritableStream(),
        });
      }

      createUnidirectionalStream() {
        return Promise.resolve(new WritableStream());
      }
    }

    try {
      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: MockWebTransport,
      });

      const connection = track(
        webTransport("https://localhost:4433/realtime", {
          maxRetries: 1,
          reconnect: true,
          retryDelay: 5,
          onReconnect: ({ attempt }) => {
            attempts.push(attempt);
          },
        }),
      );

      await connection.ready;
      instances[0].resolveClosed();
      await wait(30);

      expect(instances.length).toBe(2);
      expect(attempts).toEqual([1]);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "WebTransport", descriptor);
      } else {
        delete globalThis.WebTransport;
      }
    }
  });

  it("does not reconnect fake native transport without reconnect policy", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebTransport",
    );
    const instances = [];

    class MockWebTransport {
      constructor() {
        this.ready = Promise.resolve();
        this.closed = new Promise((resolve) => {
          this.resolveClosed = resolve;
        });
        this.datagrams = {
          readable: new ReadableStream(),
          writable: new WritableStream(),
        };
        instances.push(this);
      }

      close() {
        this.resolveClosed();
      }

      createBidirectionalStream() {
        return Promise.resolve({
          readable: new ReadableStream(),
          writable: new WritableStream(),
        });
      }

      createUnidirectionalStream() {
        return Promise.resolve(new WritableStream());
      }
    }

    try {
      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: MockWebTransport,
      });

      const connection = track(webTransport("https://localhost:4433/realtime"));

      await connection.ready;
      instances[0].resolveClosed();
      await connection.closed;
      await wait(30);

      expect(instances.length).toBe(1);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "WebTransport", descriptor);
      } else {
        delete globalThis.WebTransport;
      }
    }
  });

  it("should apply app configured defaults when opening runtime connections", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebTransport",
    );
    const configuredEl = document.createElement("div");
    const configuredAngular = new Angular();
    const attempts = [];
    const instances = [];
    let configuredWebTransport;

    class MockWebTransport {
      constructor(url, options) {
        this.url = url;
        this.options = options;
        this.ready = Promise.resolve();
        this.closed = new Promise((resolve) => {
          this.resolveClosed = resolve;
        });
        this.datagrams = {
          readable: new ReadableStream(),
          writable: new WritableStream(),
        };
        instances.push(this);
      }

      close() {
        this.resolveClosed();
      }

      createBidirectionalStream() {
        return Promise.resolve({
          readable: new ReadableStream(),
          writable: new WritableStream(),
        });
      }

      createUnidirectionalStream() {
        return Promise.resolve(new WritableStream());
      }
    }

    document.body.appendChild(configuredEl);

    try {
      Object.defineProperty(globalThis, "WebTransport", {
        configurable: true,
        writable: true,
        value: MockWebTransport,
      });

      configuredAngular.module("configuredWebTransportDefaults", []).config({
        $webTransport: {
          defaults: {
            allowPooling: true,
            congestionControl: "low-latency",
            maxRetries: 1,
            reconnect: true,
            retryDelay: 5,
          },
        },
      });

      configuredAngular
        .bootstrap(configuredEl, ["configuredWebTransportDefaults"])
        .invoke([
          "$webTransport",
          (_$webTransport_) => {
            configuredWebTransport = _$webTransport_;
          },
        ]);

      const connection = configuredWebTransport(
        "https://localhost:4433/configured",
        {
          onReconnect: ({ attempt }) => attempts.push(attempt),
        },
      );

      await connection.ready;

      expect(instances[0].options).toEqual({
        allowPooling: true,
        congestionControl: "low-latency",
      });

      instances[0].resolveClosed();
      await wait(30);

      expect(instances.length).toBe(2);
      expect(attempts).toEqual([1]);

      const localConnection = configuredWebTransport(
        "https://localhost:4433/local",
        {
          allowPooling: false,
          reconnect: false,
        },
      );

      await localConnection.ready;

      expect(instances[2].options).toEqual({
        allowPooling: false,
        congestionControl: "low-latency",
      });

      localConnection.close();
      connection.close();
    } finally {
      configuredAngular._composition.destroy();
      if (descriptor) {
        Object.defineProperty(globalThis, "WebTransport", descriptor);
      } else {
        delete globalThis.WebTransport;
      }
      dealoc(configuredEl);
    }
  });

  function track(connection) {
    connections.push(connection);

    return connection;
  }
});

describe("ngWebTransport", () => {
  let el, $animate, $compile, $scope;

  const connections = [];

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";

    const angular = new Angular();

    angular.bootstrap(el, []).invoke([
      "$animate",
      "$compile",
      "$rootScope",
      (_$animate_, _$compile_, _$rootScope_) => {
        $animate = _$animate_;
        $compile = _$compile_;
        $scope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    connections.splice(0).forEach((connection) => connection.close());
    dealoc(el);
  });

  it("connects on load, exposes the connection, and handles text datagrams", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = url;
    $scope.transportConfig = config;
    $scope.messages = [];
    $scope.opened = false;

    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="text"
        on-open="opened = true"
        on-message="messages.push($message)"
      ></div>
    `);

    await eventually(() => $scope.session && $scope.opened);
    track($scope.session);
    await $scope.session.sendText("directive:datagram");
    await eventually(() => $scope.messages.includes("directive:datagram"));

    expect($scope.messages).toContain("directive:datagram");
  });

  it("parses JSON datagrams", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = url;
    $scope.transportConfig = config;
    $scope.events = [];

    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="json"
        on-message="events.push($message.kind)"
      ></div>
    `);

    await eventually(() => $scope.session);
    track($scope.session);
    await $scope.session.sendText(JSON.stringify({ kind: "json-datagram" }));
    await eventually(() => $scope.events.includes("json-datagram"));

    expect($scope.events).toContain("json-datagram");
  });

  it("reads server-opened unidirectional streams", async () => {
    const payload = JSON.stringify({ kind: "stream", value: 42 });

    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = `${url}?welcome=stream&message=${encodeURIComponent(
      payload,
    )}`;
    $scope.transportConfig = config;
    $scope.events = [];

    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-mode="stream"
        data-config="transportConfig"
        data-as="session"
        data-transform="json"
        on-message="events.push($message.kind + ':' + $message.value)"
      ></div>
    `);

    await eventually(() => $scope.session);
    track($scope.session);
    await eventually(() => $scope.events.includes("stream:42"));

    expect($scope.events).toContain("stream:42");
  });

  it("reports JSON transform errors", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = url;
    $scope.transportConfig = config;
    $scope.errors = [];

    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="json"
        on-error="errors.push($error.name + ':' + $text)"
      ></div>
    `);

    await eventually(() => $scope.session);
    track($scope.session);
    await $scope.session.sendText("not-json");
    await eventually(() =>
      $scope.errors.some((value) => value === "SyntaxError:not-json"),
    );

    expect($scope.errors).toContain("SyntaxError:not-json");
  });

  it("reconnects when configured", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = `${url}?close=after-open`;
    $scope.transportConfig = config;
    $scope.reconnects = [];

    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-reconnect="true"
        data-retry-delay="10"
        data-max-retries="1"
        on-reconnect="reconnects.push($attempt)"
      ></div>
    `);

    await eventually(() => $scope.session);
    track($scope.session);
    await eventually(() => $scope.reconnects.includes(1));

    expect($scope.reconnects).toContain(1);
  });

  it("dispatches cancelable message events", async () => {
    const { url, config } = await webTransportTestConfig();

    let closed = false;

    $scope.transportUrl = url;
    $scope.transportConfig = {
      ...config,
      onClose: () => {
        closed = true;
      },
    };

    const host = compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="text"
      ></div>
    `);

    host.addEventListener("ng:webtransport:message", (event) => {
      if (event.detail.$message === "stop") event.preventDefault();
    });

    await eventually(() => $scope.session);
    track($scope.session);
    await $scope.session.sendText("stop");
    await eventually(() => closed);

    expect(closed).toBe(true);
  });

  it("applies realtime protocol JSON datagrams", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = url;
    $scope.transportConfig = config;
    $scope.label = "Updated";

    compileDirective('<div id="feed"></div>');
    const host = compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="json"
      ></div>
    `);

    let swapped = false;

    host.addEventListener("ng:webtransport:swapped", () => {
      swapped = true;
    });

    await eventually(() => $scope.session);
    track($scope.session);
    await $scope.session.sendText(
      JSON.stringify({
        html: "<span>{{ label }}</span>",
        target: "#feed",
        swap: "innerHTML",
      }),
    );
    await eventually(() => el.querySelector("#feed").textContent === "Updated");

    expect(el.querySelector("#feed").innerHTML).toBe("<span>Updated</span>");
    expect(swapped).toBe(true);
  });

  it("uses a valid host swap mode when the message omits one", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = url;
    $scope.transportConfig = config;

    compileDirective('<div id="host-swap-feed"></div>');
    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="json"
        data-swap="textContent"
      ></div>
    `);

    await eventually(() => $scope.session);
    track($scope.session);
    await $scope.session.sendText(
      JSON.stringify({
        html: "Host swap",
        target: "#host-swap-feed",
      }),
    );
    await eventually(
      () => el.querySelector("#host-swap-feed").textContent === "Host swap",
    );

    expect(el.querySelector("#host-swap-feed").textContent).toBe("Host swap");
  });

  it("uses $animate for realtime protocol swaps when animate is enabled", async () => {
    const { url, config } = await webTransportTestConfig();

    $scope.transportUrl = url;
    $scope.transportConfig = config;

    compileDirective('<ul id="feed"></ul>');
    compileDirective(`
      <div
        ng-web-transport="transportUrl"
        data-config="transportConfig"
        data-as="session"
        data-transform="json"
        animate="true"
      ></div>
    `);

    spyOn($animate, "enter").and.callThrough();

    await eventually(() => $scope.session);
    track($scope.session);
    await $scope.session.sendText(
      JSON.stringify({
        html: "<li>Animated</li>",
        target: "#feed",
        swap: "beforeend",
      }),
    );
    await eventually(
      () => el.querySelector("#feed").textContent === "Animated",
    );

    expect($animate.enter).toHaveBeenCalled();
  });

  function compileDirective(template) {
    const node = $compile(template.trim())($scope);

    el.appendChild(node);

    return node;
  }

  function track(connection) {
    connections.push(connection);

    return connection;
  }
});

function restoreWebTransport(descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, "WebTransport", descriptor);
  } else {
    delete globalThis.WebTransport;
  }
}

async function webTransportTestConfig(config = {}) {
  const response = await fetch("http://localhost:3000/webtransport/cert-hash");

  if (!response.ok) {
    pending("WebTransport test backend is unavailable");
  }

  const metadata = await response.json();

  return {
    url: metadata.url,
    config: {
      ...config,
      serverCertificateHashes: [
        {
          algorithm: metadata.algorithm,
          value: base64ToBytes(metadata.value),
        },
      ],
    },
  };
}

function base64ToBytes(value) {
  const binary = atob(value);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function decode(value) {
  return decoder.decode(value);
}

async function eventually(assertion, timeout = 2000) {
  const start = performance.now();

  while (performance.now() - start < timeout) {
    if (assertion()) return;

    await wait(25);
  }

  expect(assertion()).toBe(true);
}

async function readText(readable) {
  const reader = readable.getReader();

  const chunks = [];

  try {
    for (;;) {
      const result = await reader.read();

      if (result.done) break;

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);

  const bytes = new Uint8Array(length);

  let offset = 0;

  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return decoder.decode(bytes);
}
