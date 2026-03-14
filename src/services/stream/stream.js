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
    /** @private @type {() => EventSource | WebSocket} */
    this._createFn = createFn;
    this._config = {
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
    this._log = log;
    this._retryCount = 0;
    this._closed = false;
    this._heartbeatTimer = undefined;
    /** @type {EventSource | WebSocket | null} */
    this._connection = null;

    this.connect();
  }

  /**
   * Establishes a new connection using the provided createFn.
   * Closes any existing connection before creating a new one.
   */
  connect() {
    if (this._closed) return;

    // Close the old connection if it exists
    if (this._connection && typeof this._connection.close === "function") {
      this._connection.close();
    }

    // Create new connection
    this._connection = this._createFn();

    // Bind events for the new connection
    this._bindEvents();
  }

  /**
   * Sends data over a WebSocket connection.
   * Logs a warning if called on a non-WebSocket connection.
   * @param {any} data - Data to send.
   */
  send(data) {
    if (this._connection instanceof WebSocket) {
      this._connection.send(JSON.stringify(data));
    } else {
      this._log.warn("Send is only supported on WebSocket connections");
    }
  }

  /**
   * Closes the connection manually and clears the heartbeat timer.
   */
  close() {
    this._closed = true;
    clearTimeout(this._heartbeatTimer);

    if (this._connection && this._connection.close) {
      this._connection.close();
    }
  }

  /**
   * @private
   * Binds event handlers to the underlying connection (EventSource or WebSocket)
   * for open, message, error, and close events.
   */
  _bindEvents() {
    const conn = this._connection;

    if (conn instanceof EventSource) {
      conn.addEventListener("open", (err) => this._handleOpen(err));
      conn.addEventListener("message", (err) =>
        this._handleMessage(err.data, err),
      );
      conn.addEventListener("error", (err) => this._handleError(err));
    } else if (conn instanceof WebSocket) {
      conn.onopen = (err) => this._handleOpen(err);
      conn.onmessage = (err) => this._handleMessage(err.data, err);
      conn.onerror = (err) => this._handleError(err);
      conn.onclose = () => this._handleClose();
    }
  }

  /**
   * @private
   * Handles the open event from the connection.
   * @param {Event} event - The open event.
   */
  _handleOpen(event) {
    this._retryCount = 0;
    this._config.onOpen?.(event);
    this._resetHeartbeat();
  }

  /**
   * @private
   * Handles incoming messages, applies the transformMessage function,
   * and calls the onMessage callback.
   * @param {any} data - Raw message data.
   * @param {Event} event - The message event.
   */
  _handleMessage(data, event) {
    try {
      data = this._config.transformMessage?.(data) ?? data;
    } catch {
      /* empty */
    }
    this._config.onMessage?.(data, event);
    this._resetHeartbeat();
  }

  /**
   * @private
   * Handles errors emitted from the connection.
   * Calls onError callback and schedules a reconnect.
   * @param {any} err - Error object or message.
   */
  _handleError(err) {
    this._config.onError?.(err);
    this._scheduleReconnect();
  }

  /**
   * @private
   * Handles close events for WebSocket connections.
   * Triggers reconnect logic.
   */
  _handleClose() {
    this._scheduleReconnect();
  }

  /**
   * @private
   * Schedules a reconnect attempt based on retryCount and config.maxRetries.
   * Calls onReconnect callback if reconnecting.
   */
  _scheduleReconnect() {
    if (this._closed) return;

    if (this._retryCount < this._config.maxRetries) {
      this._retryCount++;
      this._config.onReconnect?.(this._retryCount);
      setTimeout(() => this.connect(), this._config.retryDelay);
    } else {
      this._log.warn("StreamConnection: Max retries reached");
    }
  }

  /**
   * @private
   * Resets the heartbeat timer. If the timer expires, the connection is closed
   * and a reconnect is attempted.
   */
  _resetHeartbeat() {
    if (!this._config.heartbeatTimeout) return;

    clearTimeout(this._heartbeatTimer);
    this._heartbeatTimer = setTimeout(() => {
      this._log.warn("StreamConnection: heartbeat timeout, reconnecting...");
      this._closeInternal();
      this._retryCount++;
      this._config.onReconnect?.(this._retryCount);
      this.connect();
    }, this._config.heartbeatTimeout);
  }

  /**
   * @private
   */
  _closeInternal() {
    clearTimeout(this._heartbeatTimer);
    this._connection?.close();
  }
}
