// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  createWebSocketRuntimeConfiguration,
  destroyWebSocketRuntimeConfiguration,
} from "./websocket.ts";

describe("$websocket", () => {
  let angular, websocket, el, RealWebSocket, sockets, exceptions;
  let failNextConnection;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";
    sockets = [];
    exceptions = [];
    failNextConnection = undefined;
    RealWebSocket = window.WebSocket;

    window.WebSocket = class MockWebSocket {
      constructor(url, protocols) {
        if (failNextConnection) {
          const error = failNextConnection;

          failNextConnection = undefined;
          throw error;
        }

        this.url = url;
        this.protocols = protocols;
        this.sent = [];
        this.closeCalls = 0;
        sockets.push(this);
        setTimeout(() => this.onopen?.({ type: "open" }), 0);
      }

      send(data) {
        this.sent.push(data);
      }

      close() {
        this.closeCalls++;
        this.onclose?.({ type: "close", code: 1000 });
      }
    };

    angular = new Angular();

    const module = angular
      .createModule("websocketExceptionBoundary", [])
      .config({
        $exceptionHandler: {
          handler: (error) => exceptions.push(error),
        },
      });

    angular.bootstrap(el, [module.name]).invoke([
      "$websocket",
      (_$websocket_) => {
        websocket = _$websocket_;
      },
    ]);
  });

  it("tears down runtime configuration idempotently", () => {
    const configuration = createWebSocketRuntimeConfiguration();
    const connection = { close: jasmine.createSpy("close") };
    configuration.connections.add(connection);

    destroyWebSocketRuntimeConfiguration(configuration);
    destroyWebSocketRuntimeConfiguration(configuration);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  it("exposes send, reconnect, error, and idempotent close behavior", async () => {
    const errors = [];
    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      onError: (event) => errors.push(event),
    });

    await wait(10);
    connection.send("hello");
    sockets[0].onerror({ type: "error" });
    connection.reconnect();
    await wait(10);

    expect(sockets[0].sent).toEqual(['"hello"']);
    expect(errors).toEqual([{ type: "error" }]);
    expect(sockets.length).toBe(2);

    connection.close();
    connection.close();
  });

  afterEach(() => {
    angular._composition.destroy();
    window.WebSocket = RealWebSocket;
    dealoc(el);
  });

  it("should call onProtocolMessage for realtime protocol messages", async () => {
    const protocolMessages = [];

    const allMessages = [];

    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      onProtocolMessage: (message) => protocolMessages.push(message),
      onMessage: (message) => allMessages.push(message),
    });

    await wait(10);

    sockets[0].onmessage({
      type: "message",
      data: JSON.stringify({ html: "<strong>Live</strong>", target: "#feed" }),
    });

    expect(protocolMessages.length).toBe(1);
    expect(protocolMessages[0].html).toBe("<strong>Live</strong>");
    expect(allMessages.length).toBe(1);
    connection.close();
  });

  it("reports detached callback failures through $exceptionHandler", async () => {
    const callbackError = new Error("message callback failed");
    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      onMessage: () => {
        throw callbackError;
      },
    });

    await wait(10);
    sockets[0].onmessage({ type: "message", data: "message" });

    expect(exceptions).toEqual([callbackError]);
    connection.close();
  });

  it("reports transform failures and delivers the raw message", async () => {
    const transformError = new Error("transform failed");
    const messages = [];
    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      transformMessage: () => {
        throw transformError;
      },
      onMessage: (message) => messages.push(message),
    });

    await wait(10);
    sockets[0].onmessage({ type: "message", data: "raw" });

    expect(exceptions).toEqual([transformError]);
    expect(messages).toEqual(["raw"]);
    connection.close();
  });

  it("uses the message event type when the native event omits one", async () => {
    const events = [];
    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      onEvent: (event) => events.push(event),
    });

    await wait(10);
    sockets[0].onmessage({ data: "message" });

    expect(events[0].type).toBe("message");
    connection.close();
  });

  it("reports reconnect construction failures", async () => {
    const reconnectError = new Error("reconnect construction failed");
    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      maxRetries: 1,
      retryDelay: 0,
    });

    await wait(10);
    failNextConnection = reconnectError;
    sockets[0].onclose({ type: "close", code: 1006 });
    await wait(10);

    expect(exceptions).toContain(reconnectError);
    connection.close();
  });

  it("should not call onProtocolMessage for plain data messages", async () => {
    const protocolMessages = [];

    const allMessages = [];

    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      onProtocolMessage: (message) => protocolMessages.push(message),
      onMessage: (message) => allMessages.push(message),
    });

    await wait(10);

    sockets[0].onmessage({
      type: "message",
      data: JSON.stringify({ count: 1 }),
    });

    expect(protocolMessages.length).toBe(0);
    expect(allMessages[0]).toEqual({ count: 1 });
    connection.close();
  });

  it("should reconnect after unexpected close with configured retry policy", async () => {
    const reconnects = [];

    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      maxRetries: 1,
      retryDelay: 5,
      onReconnect: (attempt) => reconnects.push(attempt),
    });

    await wait(10);

    sockets[0].onclose({ type: "close", code: 1006 });

    await wait(30);

    expect(sockets.length).toBeGreaterThanOrEqual(2);
    expect(reconnects).toEqual([1]);
    connection.close();
  });

  it("should stop reconnect attempts after explicit close", async () => {
    const reconnects = [];

    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
      retryDelay: 5,
      onReconnect: (attempt) => reconnects.push(attempt),
    });

    await wait(10);

    connection.close();
    await wait(30);

    expect(sockets.length).toBe(1);
    expect(reconnects).toEqual([]);
  });

  it("should close owned connections when the runtime is destroyed", async () => {
    websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
    });

    await wait(10);
    angular._composition.destroy();

    expect(sockets[0].closeCalls).toBe(1);
    expect(() => websocket("ws://example.test/after-destroy")).toThrowError(
      "Cannot create a WebSocket connection after runtime teardown",
    );
  });

  it("should release explicitly closed connections from runtime ownership", async () => {
    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 0,
    });

    await wait(10);
    connection.close();
    angular._composition.destroy();

    expect(sockets[0].closeCalls).toBe(1);
  });

  it("should reconnect once after heartbeat timeout", async () => {
    const reconnects = [];

    const connection = websocket("ws://example.test/socket", {
      heartbeatTimeout: 20,
      maxRetries: 1,
      retryDelay: 5,
      onReconnect: (attempt) => reconnects.push(attempt),
    });

    await wait(35);

    expect(sockets.length).toBe(2);
    expect(reconnects).toEqual([1]);
    connection.close();
  });

  it("should apply app configured defaults when opening runtime connections", async () => {
    const configuredEl = document.createElement("div");
    const angular = new Angular();
    let configuredWebSocket;
    const messages = [];

    document.body.appendChild(configuredEl);

    angular.createModule("configuredWebSocketDefaults", []).config({
      $websocket: {
        defaults: {
          heartbeatTimeout: 0,
          maxRetries: 1,
          protocols: ["configured-json"],
          retryDelay: 5,
          transformMessage(data) {
            return { configured: data };
          },
        },
      },
    });

    angular.bootstrap(configuredEl, ["configuredWebSocketDefaults"]).invoke([
      "$websocket",
      (_$websocket_) => {
        configuredWebSocket = _$websocket_;
      },
    ]);

    const connection = configuredWebSocket("ws://example.test/configured");

    await wait(10);

    expect(sockets[0].protocols).toEqual(["configured-json"]);

    sockets[0].onmessage({
      type: "message",
      data: "payload",
    });

    const localConnection = configuredWebSocket("ws://example.test/local", {
      heartbeatTimeout: 0,
      protocols: ["local-json"],
      onMessage: (message) => messages.push(message),
      transformMessage(data) {
        return { local: data };
      },
    });

    await wait(10);

    sockets[1].onmessage({
      type: "message",
      data: "override",
    });

    expect(messages).toEqual([{ local: "override" }]);
    expect(sockets[1].protocols).toEqual(["local-json"]);

    connection.close();
    localConnection.close();
    dealoc(configuredEl);
  });
});
