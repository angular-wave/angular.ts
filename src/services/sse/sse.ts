import { $injectTokens } from "../../injection-tokens.ts";
import { entries } from "../../shared/utils.js";
import { StreamConnection } from "../stream/stream.ts";
import type { LogService } from "../log/interface.ts";
import type { SseConfig, SseConnection, SseService } from "./interface.ts";

export class SseProvider {
  defaults: ng.SseConfig;
  _$log!: LogService;

  constructor() {
    this.defaults = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
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
    (log: ng.LogService): SseService => {
      this._$log = log;

      return (url: string, config: SseConfig = {}): SseConnection => {
        const mergedConfig = { ...this.defaults, ...config };

        const finalUrl = this._buildUrl(url, mergedConfig.params);

        return new StreamConnection(
          () =>
            new EventSource(finalUrl, {
              withCredentials: !!mergedConfig.withCredentials,
            }),
          {
            ...mergedConfig,
            onMessage: (data: unknown, event: Event) => {
              // Cast Event -> MessageEvent safely
              mergedConfig.onMessage?.(data, event as MessageEvent);
            },
          },
          this._$log,
        );
      };
    },
  ];

  /**
   * Build URL with query parameters
   */
  private _buildUrl(url: string, params?: Record<string, any>): string {
    if (!params) return url;
    const query = entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    return url + (url.includes("?") ? "&" : "?") + query;
  }
}
