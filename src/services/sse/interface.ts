/**
 * Configuration object for SSE
 */
export interface SseConfig {
  /** Include cookies/credentials when connecting */
  withCredentials?: boolean;

  /** Custom headers (Note: EventSource doesn't natively support headers; handled at app level if needed) */
  headers?: Record<string, string>;

  /** Called when the connection is successfully opened */
  onOpen?: (event: Event) => void;

  /** Called when a message event is received */
  onMessage?: (data: any, event: MessageEvent) => void;

  /** Called on connection error */
  onError?: (err: Event) => void;

  /** Transform raw SSE message data (default: JSON.parse if possible) */
  transformMessage?: (data: string) => any;

  /** Optional query parameters appended to the URL */
  params?: Record<string, any>;

  /** Called when the connection is being re-established */
  onReconnect?: (attempt: number) => void;

  /** Delay in milliseconds before attempting to reconnect (default: 1000ms) */
  retryDelay?: number;

  /** Maximum number of reconnect attempts (default: Infinity) */
  maxRetries?: number;

  /** Heartbeat timeout in milliseconds; reconnect if no message within this time */
  heartbeatTimeout?: number;
}

/**
 * Managed SSE connection object returned by $sse.
 * Provides a safe way to close the connection and stop reconnection attempts.
 */
export interface SseConnection {
  /** Manually close the SSE connection and stop all reconnect attempts */
  close(): void;

  /**
   * Manually restart the SSE connection.
   * @remarks
   * Any previous event listeners are preserved; reconnects use the original configuration.
   */
  connect(): void;
}

/**
 * $sse service type
 * Returns a managed SSE connection that automatically reconnects when needed.
 * @param url - The endpoint to connect to
 * @param config - Optional configuration object
 * @throws {URIError} If the URL is invalid
 */
export type SseService = (url: string, config?: SseConfig) => SseConnection;
