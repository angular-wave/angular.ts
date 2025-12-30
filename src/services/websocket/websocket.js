import { $injectTokens } from "../../injection-tokens.js";
import { StreamConnection } from "../stream/stream.js";

/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
export class WebSocketProvider {
  constructor() {
    /** @type {ng.WebSocketConfig} */
    this.defaults = {
      protocols: [],
      autoReconnect: true,
      reconnectInterval: 1000,
      maxRetries: Infinity,
      heartbeatInterval: 0, // ms, 0 = disabled
      transformMessage(data) {
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
    /** @param {ng.LogService} log */ (log) => {
      this._$log = log;

      /** @type {ng.WebSocketService} */
      return (url, protocols = [], config = {}) => {
        const mergedConfig = { ...this.defaults, ...config };

        mergedConfig.protocols = protocols.length
          ? protocols
          : mergedConfig.protocols;

        return new StreamConnection(
          () => new WebSocket(url, mergedConfig.protocols),
          {
            ...mergedConfig,
            onMessage: (data, event) => {
              mergedConfig.onMessage?.(data, event);
            },
            onOpen: (event) => {
              mergedConfig.onOpen?.(event);
            },
            onClose: (event) => {
              mergedConfig.onClose?.(event);
            },
            onError: (event) => {
              mergedConfig.onError?.(event);
            },
          },
          this._$log,
        );
      };
    },
  ];
}
