import type { LogService } from "../log/interface.ts";
import type { SseService } from "./interface.ts";
export declare class SseProvider {
  defaults: ng.SseConfig;
  _$log: LogService;
  /**
   * Creates the SSE provider with default reconnect and message parsing behavior.
   */
  constructor();
  /**
   * Returns the `$sse` connection factory bound to the configured defaults.
   */
  $get: ("$log" | ((log: ng.LogService) => SseService))[];
  /**
   * Builds a URL with serialized query parameters.
   */
  private _buildUrl;
}
