/**
 * Shared Stream Connection Manager
 * Handles reconnect, heartbeat, and event callbacks for SSE or WebSocket
 */
export class StreamConnection {
  /**
   * @param {() => EventSource | WebSocket} createFn - function that creates a new EventSource or WebSocket
   * @param {Object} config - config object with callbacks, retries, heartbeat, transformMessage
   * @param {ng.LogService} log - optional logger
   */
  constructor(createFn, config = {}, log = console) {
    this.createFn = createFn;
    this.config = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
      transformMessage: (data) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      },
      ...config,
    };
    this.$log = log;
    this.retryCount = 0;
    this.closed = false;
    this.heartbeatTimer = null;
    /** @type {EventSource | WebSocket | null} */
    this.connection = null;

    this.connect();
  }

  connect() {
    if (this.closed) return;

    // Close the old connection if it exists
    if (this.connection && typeof this.connection.close === "function") {
      this.connection.close();
    }

    // Create new connection
    this.connection = this.createFn();

    // Bind events for the new connection
    this.bindEvents();
  }

  bindEvents() {
    const conn = this.connection;

    if (conn instanceof EventSource) {
      conn.addEventListener("open", (e) => this.handleOpen(e));
      conn.addEventListener("message", (e) => this.handleMessage(e.data, e));
      conn.addEventListener("error", (e) => this.handleError(e));
    } else if (conn instanceof WebSocket) {
      conn.onopen = (e) => this.handleOpen(e);
      conn.onmessage = (e) => this.handleMessage(e.data, e);
      conn.onerror = (e) => this.handleError(e);
      conn.onclose = () => this.handleClose();
    }
  }

  handleOpen(event) {
    this.retryCount = 0;
    this.config.onOpen?.(event);
    this.resetHeartbeat();
  }

  handleMessage(data, event) {
    try {
      data = this.config.transformMessage?.(data) ?? data;
    } catch {
      /* empty */
    }
    this.config.onMessage?.(data, event);
    this.resetHeartbeat();
  }

  handleError(err) {
    this.config.onError?.(err);
    this.scheduleReconnect();
  }

  handleClose() {
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.closed) return;

    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      this.config.onReconnect?.(this.retryCount);
      setTimeout(() => this.connect(), this.config.retryDelay);
    } else {
      this.$log.warn("StreamConnection: Max retries reached");
    }
  }

  resetHeartbeat() {
    if (!this.config.heartbeatTimeout) return;
    clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      this.$log.warn("StreamConnection: heartbeat timeout, reconnecting...");
      this.close();
      this.retryCount++;
      this.connect();
    }, this.config.heartbeatTimeout);
  }

  send(data) {
    if (this.connection instanceof WebSocket) {
      this.connection.send(JSON.stringify(data));
    } else {
      this.$log.warn("Send is only supported on WebSocket connections");
    }
  }

  close() {
    this.closed = true;
    clearTimeout(this.heartbeatTimer);
    if (this.connection) {
      if (
        this.connection instanceof EventSource ||
        this.connection instanceof WebSocket
      ) {
        this.connection.close();
      }
    }
  }
}
