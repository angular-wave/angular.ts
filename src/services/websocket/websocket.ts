import { _log } from "../../injection-tokens.ts";
import {
  StreamConnection,
  type StreamConnectionConfig,
} from "../stream/stream.ts";
import type { LogService } from "../log/log.ts";

/**
 * WebSocket-specific configuration
 */
export interface WebSocketConfig extends StreamConnectionConfig {
  /** Optional WebSocket subprotocols */
  protocols?: string[];

  /** Called when the WebSocket connection closes */
  onClose?: (event: CloseEvent) => void;
}

export type WebSocketService = (
  url: string,
  protocols?: string[],
  config?: WebSocketConfig,
) => StreamConnection;

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
      autoReconnect: true,
      reconnectInterval: 1000,
      maxRetries: Infinity,
      heartbeatInterval: 0, // ms, 0 = disabled
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

        return new StreamConnection(
          () => new WebSocket(url, mergedConfig.protocols),
          {
            ...mergedConfig,
            onMessage: (data: unknown, event: Event | MessageEvent) => {
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
