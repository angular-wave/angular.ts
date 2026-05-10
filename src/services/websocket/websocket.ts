import { _log } from "../../injection-tokens.ts";
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
  connect(): void;

  /** Send a JSON-serialized message through the native WebSocket. */
  send(data: any): void;

  /** Close the WebSocket connection and stop reconnect attempts. */
  close(): void;
}

export type WebSocketService = (
  url: string,
  protocols?: string[],
  config?: WebSocketConfig,
) => WebSocketConnection;

/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
export class WebSocketProvider {
  defaults: ng.WebSocketConfig;
  /** @internal */
  _$log!: LogService;

  /**
   * Creates the WebSocket provider with default reconnect and message parsing behavior.
   */
  constructor() {
    this.defaults = {
      protocols: [],
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 0,
      transformMessage(data: string) {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      },
    };
  }

  /**
   * Returns the `$websocket` connection factory bound to the configured defaults.
   */
  $get = [
    _log,
    (log: ng.LogService): WebSocketService => {
      this._$log = log;

      return (
        url: string,
        protocols: string[] = [],
        config: WebSocketConfig = {},
      ) => {
        const mergedConfig = { ...this.defaults, ...config };

        mergedConfig.protocols = protocols.length
          ? protocols
          : mergedConfig.protocols;

        return new ConnectionManager(
          () => new WebSocket(url, mergedConfig.protocols),
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
          this._$log,
        );
      };
    },
  ];
}
