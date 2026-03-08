import type { LogService } from "../log/interface.ts";
import type { WebSocketService } from "./interface.ts";
/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
export declare class WebSocketProvider {
  defaults: ng.WebSocketConfig;
  _$log: LogService;
  constructor();
  $get: ("$log" | ((log: ng.LogService) => WebSocketService))[];
}
