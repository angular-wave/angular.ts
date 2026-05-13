import { _log } from "../../injection-tokens.ts";
import { entries } from "../../shared/utils.ts";
import {
  ConnectionManager,
  type ConnectionConfig,
} from "../connection/connection-manager.ts";
import type { LogService } from "../log/log.ts";

/**
 * SSE-specific configuration
 */
export interface SseConfig extends ConnectionConfig {
  /** Include cookies/credentials when connecting */
  withCredentials?: boolean;

  /** Optional query parameters appended to the URL */
  params?: Record<string, unknown>;

  /** Custom headers (EventSource doesn't natively support headers) */
  headers?: Record<string, string>;
}

/**
 * Managed SSE connection object returned by $sse.
 * Provides a safe way to close the connection and stop reconnection attempts.
 */
export interface SseConnection {
  /** Manually close the SSE connection and stop all reconnect attempts */
  close(): void;

  /**
   * Manually restart the SSE connection.
   * @remarks
   * Any previous event listeners are preserved; reconnects use the original configuration.
   */
  connect(): void;
}

/**
 * $sse service type
 * Returns a managed SSE connection that automatically reconnects when needed.
 * @param url - The endpoint to connect to
 * @param config - Optional configuration object
 * @throws {URIError} If the URL is invalid
 */
export type SseService = (url: string, config?: SseConfig) => SseConnection;

export class SseProvider {
  defaults: ng.SseConfig;
  /** @internal */
  _$log!: LogService;

  /**
   * Creates the SSE provider with default reconnect and message parsing behavior.
   */
  constructor() {
    this.defaults = {
      retryDelay: 1000,
      maxRetries: Infinity,
      heartbeatTimeout: 15000,
      transformMessage(data: string) {
        try {
          return JSON.parse(data) as unknown;
        } catch {
          return data;
        }
      },
    };
  }

  /**
   * Returns the `$sse` connection factory bound to the configured defaults.
   */
  $get = [
    _log,
    (log: ng.LogService): SseService => {
      this._$log = log;

      return (url: string, config: SseConfig = {}): SseConnection => {
        const mergedConfig = { ...this.defaults, ...config };

        const finalUrl = this._buildUrl(url, mergedConfig.params);

        return new ConnectionManager(
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
   * Builds a URL with serialized query parameters.
   */
  /** @internal */
  private _buildUrl(url: string, params?: Record<string, unknown>): string {
    if (!params) return url;
    const query = entries(params)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(
            serializeQueryValue(v),
          )}`,
      )
      .join("&");

    return url + (url.includes("?") ? "&" : "?") + query;
  }
}

function serializeQueryValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "undefined":
      return "";
    default:
      return value === null ? "" : JSON.stringify(value);
  }
}
