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
  constructor(
    createFn: () => EventSource | WebSocket,
    config?: ng.StreamConnectionConfig,
    log?: ng.LogService,
  );
  /** @private @type {() => EventSource | WebSocket} */
  private _createFn;
  _config: {
    onOpen?: (event: Event) => void;
    onMessage?: (data: any, event: Event | MessageEvent) => void;
    onError?: (err: any) => void;
    onReconnect?: (attempt: number) => void;
    retryDelay: number;
    maxRetries: number;
    heartbeatTimeout: number;
    transformMessage: (data: string) => any;
  };
  _log: import("../log/interface.ts").LogService;
  _retryCount: number;
  _closed: boolean;
  _heartbeatTimer: number;
  /** @type {EventSource | WebSocket | null} */
  _connection: EventSource | WebSocket | null;
  /**
   * Establishes a new connection using the provided createFn.
   * Closes any existing connection before creating a new one.
   */
  connect(): void;
  /**
   * Sends data over a WebSocket connection.
   * Logs a warning if called on a non-WebSocket connection.
   * @param {any} data - Data to send.
   */
  send(data: any): void;
  /**
   * Closes the connection manually and clears the heartbeat timer.
   */
  close(): void;
  /**
   * @private
   * Binds event handlers to the underlying connection (EventSource or WebSocket)
   * for open, message, error, and close events.
   */
  private _bindEvents;
  /**
   * @private
   * Handles the open event from the connection.
   * @param {Event} event - The open event.
   */
  private _handleOpen;
  /**
   * @private
   * Handles incoming messages, applies the transformMessage function,
   * and calls the onMessage callback.
   * @param {any} data - Raw message data.
   * @param {Event} event - The message event.
   */
  private _handleMessage;
  /**
   * @private
   * Handles errors emitted from the connection.
   * Calls onError callback and schedules a reconnect.
   * @param {any} err - Error object or message.
   */
  private _handleError;
  /**
   * @private
   * Handles close events for WebSocket connections.
   * Triggers reconnect logic.
   */
  private _handleClose;
  /**
   * @private
   * Schedules a reconnect attempt based on retryCount and config.maxRetries.
   * Calls onReconnect callback if reconnecting.
   */
  private _scheduleReconnect;
  /**
   * @private
   * Resets the heartbeat timer. If the timer expires, the connection is closed
   * and a reconnect is attempted.
   */
  private _resetHeartbeat;
  /**
   * @private
   */
  private _closeInternal;
}
