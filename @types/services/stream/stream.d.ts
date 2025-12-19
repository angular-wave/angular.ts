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
  createFn: () => EventSource | WebSocket;
  config: {
    onOpen?: (event: Event) => void;
    onMessage?: (data: any, event: Event | MessageEvent) => void;
    onError?: (err: any) => void;
    onReconnect?: (attempt: number) => void;
    retryDelay: number;
    maxRetries: number;
    heartbeatTimeout: number;
    transformMessage: (data: string) => any;
  };
  $log: import("../log/interface.ts").LogService;
  retryCount: number;
  closed: boolean;
  heartbeatTimer: number;
  /** @type {EventSource | WebSocket | null} */
  connection: EventSource | WebSocket | null;
  /**
   * Establishes a new connection using the provided createFn.
   * Closes any existing connection before creating a new one.
   */
  connect(): void;
  /**
   * Binds event handlers to the underlying connection (EventSource or WebSocket)
   * for open, message, error, and close events.
   */
  bindEvents(): void;
  /**
   * Handles the open event from the connection.
   * @param {Event} event - The open event.
   */
  handleOpen(event: Event): void;
  /**
   * Handles incoming messages, applies the transformMessage function,
   * and calls the onMessage callback.
   * @param {any} data - Raw message data.
   * @param {Event} event - The message event.
   */
  handleMessage(data: any, event: Event): void;
  /**
   * Handles errors emitted from the connection.
   * Calls onError callback and schedules a reconnect.
   * @param {any} err - Error object or message.
   */
  handleError(err: any): void;
  /**
   * Handles close events for WebSocket connections.
   * Triggers reconnect logic.
   */
  handleClose(): void;
  /**
   * Schedules a reconnect attempt based on retryCount and config.maxRetries.
   * Calls onReconnect callback if reconnecting.
   */
  scheduleReconnect(): void;
  /**
   * Resets the heartbeat timer. If the timer expires, the connection is closed
   * and a reconnect is attempted.
   */
  resetHeartbeat(): void;
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
  _closeInternal(): void;
}
