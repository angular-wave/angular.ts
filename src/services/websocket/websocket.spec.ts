// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("$websocket", () => {
  let websocket, el, RealWebSocket, sockets;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";
    sockets = [];
    RealWebSocket = window.WebSocket;

    window.WebSocket = class MockWebSocket {
      constructor(url, protocols) {
        this.url = url;
        this.protocols = protocols;
        this.sent = [];
        sockets.push(this);
        setTimeout(() => this.onopen?.({ type: "open" }), 0);
      }

      send(data) {
        this.sent.push(data);
      }

      close() {
        this.onclose?.({ type: "close", code: 1000 });
      }
    };

    const angular = new Angular();

    angular.bootstrap(el, []).invoke((_$websocket_) => {
      websocket = _$websocket_;
    });
  });

  afterEach(() => {
    window.WebSocket = RealWebSocket;
    dealoc(el);
  });

  it("should call onProtocolMessage for realtime protocol messages", async () => {
    const protocolMessages = [];

    const allMessages = [];

    const connection = websocket("ws://example.test/socket", [], {
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

  it("should not call onProtocolMessage for plain data messages", async () => {
    const protocolMessages = [];

    const allMessages = [];

    const connection = websocket("ws://example.test/socket", [], {
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
});
