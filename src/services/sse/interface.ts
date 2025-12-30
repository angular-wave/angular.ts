import { StreamConnectionConfig } from "../stream/interface.ts";

/**
 * SSE-specific configuration
 */
export interface SseConfig extends StreamConnectionConfig {
  /** Include cookies/credentials when connecting */
  withCredentials?: boolean;

  /** Optional query parameters appended to the URL */
  params?: Record<string, any>;

  /** Custom headers (EventSource doesn't natively support headers) */
  headers?: Record<string, string>;
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
