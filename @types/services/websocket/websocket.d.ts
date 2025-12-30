/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
export class WebSocketProvider {
  /** @type {ng.WebSocketConfig} */
  defaults: ng.WebSocketConfig;
  $get: (
    | string
    | ((
        log: ng.LogService,
      ) => (
        url: string,
        protocols?: string[],
        config?: import("./interface.ts").WebSocketConfig,
      ) => StreamConnection)
  )[];
  _$log: import("../log/interface.ts").LogService;
}
import { StreamConnection } from "../stream/stream.js";
