import { $injectTokens } from "../../injection-tokens.ts";
import { StreamConnection } from "../stream/stream.ts";
import type { LogService } from "../log/interface.ts";
import type { WebSocketConfig, WebSocketService } from "./interface.ts";

/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
export class WebSocketProvider {
  defaults: ng.WebSocketConfig;
  _$log!: LogService;

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

  $get = [
    $injectTokens._log,
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
