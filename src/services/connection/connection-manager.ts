/**
 * Shared connection manager for push transports such as SSE and WebSocket.
 * Handles reconnect, heartbeat, and event callbacks.
 */
import { isFunction, isInstanceOf } from "../../shared/utils.ts";

export interface ConnectionConfig {
  /** Called when the connection opens */
  onOpen?: (event: Event) => void;

  /** Called when a message is received */
  onMessage?: (data: any, event: Event | MessageEvent) => void;

  /** Called with every registered connection message, including custom SSE event types */
  onEvent?: (message: ConnectionEvent) => void;

  /** Called when an error occurs */
  onError?: (err: any) => void;

  /** Called when a WebSocket connection closes */
  onClose?: (event: CloseEvent) => void;

  /** Called when a reconnect attempt happens */
  onReconnect?: (attempt: number) => void;

  /** Delay between reconnect attempts in milliseconds */
  retryDelay?: number;

  /** Maximum number of reconnect attempts */
  maxRetries?: number;

  /** Timeout in milliseconds to detect heartbeat inactivity */
  heartbeatTimeout?: number;

  /** Function to transform incoming messages */
  transformMessage?: (data: any) => any;

  /** Additional EventSource event names to subscribe to */
  eventTypes?: string[];
}

export interface ConnectionEvent<T = any> {
  type: string;
  data: T;
  rawData: any;
  event: Event | MessageEvent;
}

/**
 * @internal
 */
export class ConnectionManager {
  /** @internal */
  private _createFn: () => EventSource | WebSocket;
  /** @internal */
  _config: {
    onOpen?: (event: Event) => void;
    onMessage?: (data: any, event: Event | MessageEvent) => void;
    onEvent?: (message: ConnectionEvent) => void;
    onError?: (err: any) => void;
    onClose?: (event: CloseEvent) => void;
    onReconnect?: (attempt: number) => void;
    retryDelay: number;
    maxRetries: number;
    heartbeatTimeout: number;
    transformMessage: (data: any) => any;
    eventTypes?: string[];
  };

  /** @internal */
  _log: ng.LogService;
  /** @internal */
  _retryCount: number;
  /** @internal */
  _closed: boolean;
  /** @internal */
  _heartbeatTimer: ReturnType<typeof setTimeout> | undefined;
  /** @internal */
  _connection: EventSource | WebSocket | null;

  constructor(
    createFn: () => EventSource | WebSocket,
    config: ng.ConnectionConfig = {},
    log: ng.LogService = console as unknown as ng.LogService,
  ) {
    this._createFn = createFn;
    this._config = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
      transformMessage: (data: string) => {
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
    this._connection = null;

    this.connect();
  }

  connect(): void {
    if (this._closed) return;

    if (this._connection && isFunction(this._connection.close)) {
      this._connection.close();
    }

    this._connection = this._createFn();
    this._bindEvents();
  }

  send(data: any): void {
    if (isInstanceOf(this._connection, WebSocket)) {
      this._connection.send(JSON.stringify(data));
    } else {
      this._log.warn("Send is only supported on WebSocket connections");
    }
  }

  close(): void {
    this._closed = true;
    clearTimeout(this._heartbeatTimer);

    if (this._connection?.close) {
      this._connection.close();
    }
  }

  /** @internal */
  private _bindEvents(): void {
    const conn = this._connection;

    if (isInstanceOf(conn, EventSource)) {
      conn.addEventListener("open", (err) => {
        this._handleOpen(err);
      });
      conn.addEventListener("message", (err) => {
        this._handleMessage(err.data, err);
      });
      this._config.eventTypes?.forEach((eventType) => {
        if (eventType === "message") return;
        conn.addEventListener(eventType, (event) => {
          const messageEvent = event;

          this._handleMessage(messageEvent.data, messageEvent);
        });
      });
      conn.addEventListener("error", (err) => {
        this._handleError(err);
      });
    } else if (isInstanceOf(conn, WebSocket)) {
      conn.onopen = (err) => {
        this._handleOpen(err);
      };
      conn.onmessage = (err) => {
        this._handleMessage(err.data, err);
      };
      conn.onerror = (err) => {
        this._handleError(err);
      };
      conn.onclose = (event) => {
        this._handleClose(event);
      };
    }
  }

  /** @internal */
  private _handleOpen(event: Event): void {
    this._retryCount = 0;
    this._config.onOpen?.(event);
    this._resetHeartbeat();
  }

  /** @internal */
  private _handleMessage(data: any, event: Event | MessageEvent): void {
    const rawData = data;

    try {
      data = this._config.transformMessage?.(data) ?? data;
    } catch {
      /* empty */
    }
    this._config.onEvent?.({
      type: event.type || "message",
      data,
      rawData,
      event,
    });
    this._config.onMessage?.(data, event);
    this._resetHeartbeat();
  }

  /** @internal */
  private _handleError(err: any): void {
    this._config.onError?.(err);
    this._scheduleReconnect();
  }

  /** @internal */
  private _handleClose(event: CloseEvent): void {
    this._config.onClose?.(event);
    this._scheduleReconnect();
  }

  /** @internal */
  private _scheduleReconnect(): void {
    if (this._closed) return;

    if (this._retryCount < this._config.maxRetries) {
      this._retryCount++;
      this._config.onReconnect?.(this._retryCount);
      setTimeout(() => {
        this.connect();
      }, this._config.retryDelay);
    } else {
      this._log.warn("ConnectionManager: Max retries reached");
    }
  }

  /** @internal */
  private _resetHeartbeat(): void {
    if (!this._config.heartbeatTimeout) return;

    clearTimeout(this._heartbeatTimer);
    this._heartbeatTimer = setTimeout(() => {
      this._log.warn("ConnectionManager: heartbeat timeout, reconnecting...");
      this._closeInternal();
      this._retryCount++;
      this._config.onReconnect?.(this._retryCount);
      this.connect();
    }, this._config.heartbeatTimeout);
  }

  /** @internal */
  private _closeInternal(): void {
    clearTimeout(this._heartbeatTimer);
    this._connection?.close();
  }
}
