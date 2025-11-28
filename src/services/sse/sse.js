import { $injectTokens } from "../../injection-tokens.js";

/**
 * SSE Provider
 *
 * Usage:
 *   const source = $sse('/events', {
 *     onMessage: (data) => console.log(data),
 *     onError: (err) => console.error(err),
 *     retryDelay: 2000,
 *     heartbeatTimeout: 10000,
 *   });
 *
 *   source.close();
 */
export class SseProvider {
  constructor() {
    /**
     * Optional provider-level defaults
     * @type {ng.SseConfig}
     */
    this.defaults = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000, // 15 seconds
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
    $injectTokens.$log,
    /**
     * Returns the $sse service function
     * @param {ng.LogService} log
     * @returns {ng.SseService}
     */
    (log) => {
      this.$log = log;
      return (url, config = {}) => {
        const mergedConfig = { ...this.defaults, ...config };
        const finalUrl = this.#buildUrl(url, mergedConfig.params);
        return this.#createConnection(finalUrl, mergedConfig);
      };
    },
  ];

  /**
   * Build URL with query parameters
   * @param {string} url
   * @param {Record<string, any>=} params
   * @returns {string}
   */
  #buildUrl(url, params) {
    if (!params) return url;
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    return url + (url.includes("?") ? "&" : "?") + query;
  }

  /**
   * Creates a managed SSE connection with reconnect and heartbeat
   * @param {string} url
   * @param {ng.SseConfig} config
   * @returns {import("./interface.ts").SseConnection}
   */
  #createConnection(url, config) {
    let es;
    let retryCount = 0;
    let closed = false;
    let heartbeatTimer;

    const connect = () => {
      if (closed) return;

      es = new EventSource(url, {
        withCredentials: !!config.withCredentials,
      });

      es.addEventListener("open", (e) => {
        retryCount = 0;
        config.onOpen?.(e);
        if (config.heartbeatTimeout) resetHeartbeat();
      });

      es.addEventListener("message", (e) => {
        let data = e.data;
        try {
          data = config.transformMessage ? config.transformMessage(data) : data;
        } catch {
          /* empty */
        }
        config.onMessage?.(data, e);
        if (config.heartbeatTimeout) resetHeartbeat();
      });

      es.addEventListener("error", (err) => {
        config.onError?.(err);
        if (closed) return;
        es.close();

        if (retryCount < config.maxRetries) {
          retryCount++;
          config.onReconnect?.(retryCount);
          setTimeout(connect, config.retryDelay);
        } else {
          this.$log.warn("SSE: Max retries reached");
        }
      });
    };

    const resetHeartbeat = () => {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        this.$log.warn("SSE: heartbeat timeout, reconnecting...");
        es.close();
        config.onReconnect?.(++retryCount);
        connect();
      }, config.heartbeatTimeout);
    };

    connect();

    return {
      close() {
        closed = true;
        clearTimeout(heartbeatTimer);
        es.close();
      },
      connect() {
        if (closed === false) {
          close();
        }
        connect();
      },
    };
  }
}
