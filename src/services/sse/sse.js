import { $injectTokens } from "../../injection-tokens.js";
import { entries } from "../../shared/utils.js";
import { StreamConnection } from "../stream/stream.js";

export class SseProvider {
  constructor() {
    /** @type {ng.SseConfig} */
    this.defaults = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
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

      /** @type {ng.SseService} */
      return (url, config = {}) => {
        const mergedConfig = { ...this.defaults, ...config };

        const finalUrl = this.#buildUrl(url, mergedConfig.params);

        return new StreamConnection(
          () =>
            new EventSource(finalUrl, {
              withCredentials: !!mergedConfig.withCredentials,
            }),
          {
            ...mergedConfig,
            onMessage: (data, event) => {
              // Cast Event -> MessageEvent safely
              mergedConfig.onMessage?.(
                data,
                /** @type{MessageEvent} */ (event),
              );
            },
          },
          this._$log,
        );
      };
    },
  ];

  /**
   * Build URL with query parameters
   * @param {string} url
   * @param {Record<string, any>=} params
   * @returns {string}
   * @throws {URIError}
   */
  #buildUrl(url, params) {
    if (!params) return url;
    const query = entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    return url + (url.includes("?") ? "&" : "?") + query;
  }
}
