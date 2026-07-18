import { entries } from "../../shared/utils.ts";
import {
  ConnectionManager,
  type ConnectionConfig,
} from "../connection/connection-manager.ts";
import type { LogService } from "../log/log.ts";

/**
 * SSE-specific configuration
 */
export interface SseConfig extends ConnectionConfig {
  /** Include cookies/credentials when connecting */
  withCredentials?: boolean;

  /** Optional query parameters appended to the URL */
  params?: Record<string, unknown>;
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
  reconnect(): void;
}

/**
 * $sse service type
 * Returns a managed SSE connection that automatically reconnects when needed.
 * @param url - The endpoint to connect to
 * @param config - Optional configuration object
 * @throws {URIError} If the URL is invalid
 */
export type SseService = (url: string, config?: SseConfig) => SseConnection;

/** @internal */
export interface SseRuntimeConfiguration {
  defaults: SseConfig;
  readonly connections: Set<SseConnection>;
  destroyed: boolean;
}

/** @internal */
export function createSseRuntimeConfiguration(): SseRuntimeConfiguration {
  return {
    defaults: {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
      transformMessage(data: string) {
        try {
          return JSON.parse(data) as unknown;
        } catch {
          return data;
        }
      },
    },
    connections: new Set(),
    destroyed: false,
  };
}

/** @internal */
export function applySseConfiguration(
  configuration: SseRuntimeConfiguration,
  config: { defaults?: SseConfig },
): void {
  if (config.defaults !== undefined) {
    configuration.defaults = {
      ...configuration.defaults,
      ...config.defaults,
    };
  }
}

/** @internal */
export function destroySseRuntimeConfiguration(
  configuration: SseRuntimeConfiguration,
): void {
  if (configuration.destroyed) return;

  configuration.destroyed = true;

  for (const connection of configuration.connections) connection.close();

  configuration.connections.clear();
}

/** @internal */
export function createSseService(
  log: LogService,
  configuration: SseRuntimeConfiguration,
  getEventSourceConstructor: () => typeof EventSource,
): SseService {
  return (url: string, config: SseConfig = {}): SseConnection => {
    if (configuration.destroyed) {
      throw new Error("Cannot create an SSE connection after runtime teardown");
    }

    const mergedConfig = { ...configuration.defaults, ...config };
    const finalUrl = buildUrl(url, mergedConfig.params);
    const manager = new ConnectionManager(
      () => {
        const EventSourceConstructor = getEventSourceConstructor();

        return new EventSourceConstructor(finalUrl, {
          withCredentials: !!mergedConfig.withCredentials,
        });
      },
      {
        ...mergedConfig,
        onMessage: (data: unknown, event: Event) => {
          mergedConfig.onMessage?.(data, event as MessageEvent);
        },
      },
      log,
    );
    let closed = false;
    const connection: SseConnection = {
      reconnect() {
        manager.reconnect();
      },
      close() {
        if (closed) return;

        closed = true;
        configuration.connections.delete(connection);
        manager.close();
      },
    };

    configuration.connections.add(connection);

    return connection;
  };
}

function buildUrl(url: string, params?: Record<string, unknown>): string {
  if (!params) return url;
  const query = entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(
          serializeQueryValue(value),
        )}`,
    )
    .join("&");

  return url + (url.includes("?") ? "&" : "?") + query;
}

function serializeQueryValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "undefined":
      return "";
    case "object":
      return value === null ? "" : JSON.stringify(value);
    case "function":
      return JSON.stringify(value);
  }

  return "";
}
