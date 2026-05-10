// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

const decoder = new TextDecoder();

const encoder = new TextEncoder();

describe("$webTransport", () => {
  let webTransport, webTransportProvider, el;

  const connections = [];

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";

    const angular = new Angular();

    angular.module("default", []).config(($webTransportProvider) => {
      webTransportProvider = $webTransportProvider;
    });

    angular.bootstrap(el, ["default"]).invoke((_$webTransport_) => {
      webTransport = _$webTransport_;
    });
  });

  afterEach(() => {
    connections.splice(0).forEach((connection) => connection.close());
    dealoc(el);
  });

  it("should be available as provider", () => {
    expect(webTransportProvider).toBeDefined();
  });

  it("should be available as a service", () => {
    expect(webTransport).toBeDefined();
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

  function track(connection) {
    connections.push(connection);

    return connection;
  }
});

describe("ngWebTransport", () => {
  let el, $compile, $scope;

  const connections = [];

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";

    const angular = new Angular();

    angular.bootstrap(el, []).invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $scope = _$rootScope_;
    });
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
        data-on-open="opened = true"
        data-on-message="messages.push($message)"
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
        data-on-message="events.push($message.kind)"
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
        data-on-message="events.push($message.kind + ':' + $message.value)"
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
        data-on-error="errors.push($error.name + ':' + $text)"
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
        data-on-reconnect="reconnects.push($attempt)"
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
