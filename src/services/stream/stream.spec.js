import { StreamConnection } from "./stream.js"; // adjust path

describe("StreamConnection", () => {
  let listeners, log, EventSourceMock, WebSocketMock;

  beforeEach(() => {
    jasmine.clock().install();
    listeners = {};

    // Local mock logger
    log = {
      debug: jasmine.createSpy("debug"),
      error: jasmine.createSpy("error"),
      info: jasmine.createSpy("info"),
      log: jasmine.createSpy("log"),
      warn: jasmine.createSpy("warn"),
    };

    // Mock EventSource
    EventSourceMock = function () {
      this.addEventListener = (type, cb) => {
        listeners[type] = cb;
      };
      this.close = jasmine.createSpy("close");
    };
    window.EventSource = EventSourceMock;

    // Mock WebSocket
    WebSocketMock = function () {
      this.send = jasmine.createSpy("send");
      this.close = jasmine.createSpy("close");
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
    };
    window.WebSocket = WebSocketMock;
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    listeners = {};
  });

  it("calls onOpen when EventSource connection opens", () => {
    const onOpen = jasmine.createSpy("onOpen");
    new StreamConnection(() => new EventSourceMock(), { onOpen }, log);

    listeners.open({ type: "open" });
    expect(onOpen).toHaveBeenCalledWith({ type: "open" });
  });

  it("calls onMessage and applies transformMessage", () => {
    const onMessage = jasmine.createSpy("onMessage");
    const transformMessage = jasmine
      .createSpy("transformMessage")
      .and.callFake((d) => `transformed:${d}`);

    new StreamConnection(
      () => new EventSourceMock(),
      { onMessage, transformMessage },
      log,
    );

    listeners.message({ data: "hello" });

    expect(transformMessage).toHaveBeenCalledWith("hello");
    expect(onMessage).toHaveBeenCalledWith("transformed:hello", {
      data: "hello",
    });
  });

  it("calls onError and schedules reconnect with retry logic", () => {
    const onError = jasmine.createSpy("onError");
    const onReconnect = jasmine.createSpy("onReconnect");

    new StreamConnection(
      () => new EventSourceMock(),
      { onError, onReconnect, retryDelay: 100, maxRetries: 2 },
      log,
    );

    listeners.error("err1");
    expect(onError).toHaveBeenCalledWith("err1");

    jasmine.clock().tick(101);
    expect(onReconnect).toHaveBeenCalledWith(1);

    listeners.error("err2");
    jasmine.clock().tick(101);
    expect(onReconnect).toHaveBeenCalledWith(2);

    listeners.error("err3");
    jasmine.clock().tick(101);
    expect(log.warn).toHaveBeenCalledWith(
      "StreamConnection: Max retries reached",
    );
  });

  it("closes EventSource manually", () => {
    const conn = new StreamConnection(() => new EventSourceMock(), {}, log);
    conn.close();
    expect(conn.connection.close).toHaveBeenCalled();
  });

  xit("reconnects manually via connect()", () => {
    const firstConn = { close: jasmine.createSpy("close") };
    const secondConn = { close: jasmine.createSpy("close") };
    let callCount = 0;

    const createFn = jasmine
      .createSpy("createFn")
      .and.callFake(() => (callCount++ === 0 ? firstConn : secondConn));

    // Instantiate without auto-connect
    const conn = new StreamConnection(createFn, {}, log);
    conn.connection = firstConn; // manually assign first connection
    conn.closed = false; // ensure connect() will proceed

    // Manual reconnect
    conn.connect();

    // First connection should be closed
    expect(firstConn.close).toHaveBeenCalled();

    // New connection assigned
    expect(conn.connection).toBe(secondConn);

    // Clean up
    conn.close();
    expect(secondConn.close).toHaveBeenCalled();
  });

  it("resets heartbeat on message and reconnects if timeout", () => {
    const heartbeatTimeout = 1000;
    new StreamConnection(
      () => new EventSourceMock(),
      { heartbeatTimeout },
      log,
    );

    listeners.message({ data: "ping" });

    jasmine.clock().tick(heartbeatTimeout - 100);
    expect(log.warn).not.toHaveBeenCalled();

    jasmine.clock().tick(200);
    expect(log.warn).toHaveBeenCalledWith(
      "StreamConnection: heartbeat timeout, reconnecting...",
    );
  });

  it("sends data via WebSocket", () => {
    const data = { msg: "hi" };
    const wsInstance = new WebSocketMock();
    const conn = new StreamConnection(() => wsInstance, {}, log);

    conn.send(data);
    expect(wsInstance.send).toHaveBeenCalledWith(JSON.stringify(data));
  });

  it("warns when send is called on EventSource", () => {
    const conn = new StreamConnection(() => new EventSourceMock(), {}, log);

    conn.send({ msg: "hi" });
    expect(log.warn).toHaveBeenCalledWith(
      "Send is only supported on WebSocket connections",
    );
  });
});
