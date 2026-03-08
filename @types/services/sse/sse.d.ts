import type { LogService } from "../log/interface.ts";
import type { SseService } from "./interface.ts";
export declare class SseProvider {
  defaults: ng.SseConfig;
  _$log: LogService;
  constructor();
  $get: ("$log" | ((log: ng.LogService) => SseService))[];
  /**
   * Build URL with query parameters
   */
  private _buildUrl;
}
