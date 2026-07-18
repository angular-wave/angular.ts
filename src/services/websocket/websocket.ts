import {
  ConnectionManager,
  type ConnectionConfig,
} from "../connection/connection-manager.ts";
import {
  isRealtimeProtocolMessage,
  type RealtimeProtocolMessage,
} from "../../directive/realtime/protocol.ts";
import type { LogService } from "../log/log.ts";

/**
 * WebSocket-specific configuration
 */
export interface WebSocketConfig extends ConnectionConfig {
  /** Optional WebSocket subprotocols */
  protocols?: string[];
  /** Called when a decoded message uses the realtime protocol shape. */
  onProtocolMessage?: (
    data: RealtimeProtocolMessage,
    event: Event | MessageEvent,
  ) => void;
}

/**
 * Managed WebSocket connection returned by $websocket.
 */
export interface WebSocketConnection {
  /** Manually restart the WebSocket connection. */
  reconnect(): void;

  /** Send a JSON-serialized message through the native WebSocket. */
  send(data: unknown): void;

  /** Close the WebSocket connection and stop reconnect attempts. */
  close(): void;
}

export type WebSocketService = (
  url: string,
  config?: WebSocketConfig,
) => WebSocketConnection;

/**
 * @internal
 */
export interface WebSocketRuntimeConfiguration {
  defaults: WebSocketConfig;
  readonly connections: Set<WebSocketConnection>;
  destroyed: boolean;
}

/** @internal */
export function createWebSocketRuntimeConfiguration(): WebSocketRuntimeConfiguration {
  return {
    defaults: {
      protocols: [],
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 0,
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
export function applyWebSocketConfiguration(
  configuration: WebSocketRuntimeConfiguration,
  config: { defaults?: WebSocketConfig },
): void {
  if (config.defaults !== undefined) {
    configuration.defaults = {
      ...configuration.defaults,
      ...config.defaults,
    };
  }
}

/** @internal */
export function destroyWebSocketRuntimeConfiguration(
  configuration: WebSocketRuntimeConfiguration,
): void {
  if (configuration.destroyed) return;

  configuration.destroyed = true;

  for (const connection of configuration.connections) connection.close();

  configuration.connections.clear();
}

/** @internal */
export function createWebSocketService(
  log: LogService,
  configuration: WebSocketRuntimeConfiguration,
  WebSocketConstructor: typeof WebSocket,
): WebSocketService {
  return (url: string, config: WebSocketConfig = {}) => {
    if (configuration.destroyed) {
      throw new Error(
        "Cannot create a WebSocket connection after runtime teardown",
      );
    }

    const mergedConfig = { ...configuration.defaults, ...config };
    const manager = new ConnectionManager(
      () => new WebSocketConstructor(url, mergedConfig.protocols),
      {
        ...mergedConfig,
        onMessage: (data: unknown, event: Event | MessageEvent) => {
          if (isRealtimeProtocolMessage(data)) {
            mergedConfig.onProtocolMessage?.(data, event);
          }

          mergedConfig.onMessage?.(data, event);
        },
        onOpen: (event: Event) => {
          mergedConfig.onOpen?.(event);
        },
        onClose: (event: CloseEvent) => {
          mergedConfig.onClose?.(event);
        },
        onError: (event: Event) => {
          mergedConfig.onError?.(event);
        },
      },
      log,
    );
    let closed = false;
    const connection: WebSocketConnection = {
      reconnect() {
        manager.reconnect();
      },
      send(data) {
        manager.send(data);
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
