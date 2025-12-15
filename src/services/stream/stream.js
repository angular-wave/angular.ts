/**
 * Shared Stream Connection Manager
 * Handles reconnect, heartbeat, and event callbacks for SSE or WebSocket
 */
export class StreamConnection {
  /**
   * @param {() => EventSource | WebSocket} createFn - Function that creates a new EventSource or WebSocket.
   * @param {ng.StreamConnectionConfig} config - Configuration object with callbacks, retries, heartbeat, transformMessage.
   * @param {ng.LogService} log - Optional logger (default: console).
   */
  constructor(createFn, config = {}, log = console) {
    this.createFn = createFn;
    this.config = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
      transformMessage: (/** @type {string} */ data) => {
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
    this.heartbeatTimer = undefined;
    /** @type {EventSource | WebSocket | null} */
    this.connection = null;

    this.connect();
  }

  /**
   * Establishes a new connection using the provided createFn.
   * Closes any existing connection before creating a new one.
   */
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

  /**
   * Binds event handlers to the underlying connection (EventSource or WebSocket)
   * for open, message, error, and close events.
   */
  bindEvents() {
    const conn = this.connection;

    if (conn instanceof EventSource) {
      conn.addEventListener("open", (err) => this.handleOpen(err));
      conn.addEventListener("message", (err) =>
        this.handleMessage(err.data, err),
      );
      conn.addEventListener("error", (err) => this.handleError(err));
    } else if (conn instanceof WebSocket) {
      conn.onopen = (err) => this.handleOpen(err);
      conn.onmessage = (err) => this.handleMessage(err.data, err);
      conn.onerror = (err) => this.handleError(err);
      conn.onclose = () => this.handleClose();
    }
  }

  /**
   * Handles the open event from the connection.
   * @param {Event} event - The open event.
   */
  handleOpen(event) {
    this.retryCount = 0;
    this.config.onOpen?.(event);
    this.resetHeartbeat();
  }

  /**
   * Handles incoming messages, applies the transformMessage function,
   * and calls the onMessage callback.
   * @param {any} data - Raw message data.
   * @param {Event} event - The message event.
   */
  handleMessage(data, event) {
    try {
      data = this.config.transformMessage?.(data) ?? data;
    } catch {
      /* empty */
    }
    this.config.onMessage?.(data, event);
    this.resetHeartbeat();
  }

  /**
   * Handles errors emitted from the connection.
   * Calls onError callback and schedules a reconnect.
   * @param {any} err - Error object or message.
   */
  handleError(err) {
    this.config.onError?.(err);
    this.scheduleReconnect();
  }

  /**
   * Handles close events for WebSocket connections.
   * Triggers reconnect logic.
   */
  handleClose() {
    this.scheduleReconnect();
  }

  /**
   * Schedules a reconnect attempt based on retryCount and config.maxRetries.
   * Calls onReconnect callback if reconnecting.
   */
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

  /**
   * Resets the heartbeat timer. If the timer expires, the connection is closed
   * and a reconnect is attempted.
   */
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

  /**
   * Sends data over a WebSocket connection.
   * Logs a warning if called on a non-WebSocket connection.
   * @param {any} data - Data to send.
   */
  send(data) {
    if (this.connection instanceof WebSocket) {
      this.connection.send(JSON.stringify(data));
    } else {
      this.$log.warn("Send is only supported on WebSocket connections");
    }
  }

  /**
   * Closes the connection manually and clears the heartbeat timer.
   */
  close() {
    this.closed = true;
    clearTimeout(this.heartbeatTimer);

    if (this.connection && this.connection.close) {
      this.connection.close();
    }
  }
}
