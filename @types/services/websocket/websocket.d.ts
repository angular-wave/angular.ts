import type { LogService } from "../log/interface.ts";
import type { WebSocketService } from "./interface.ts";
/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
export declare class WebSocketProvider {
  defaults: ng.WebSocketConfig;
  _$log: LogService;
  /**
   * Creates the WebSocket provider with default reconnect and message parsing behavior.
   */
  constructor();
  /**
   * Returns the `$websocket` connection factory bound to the configured defaults.
   */
  $get: ("$log" | ((log: ng.LogService) => WebSocketService))[];
}
