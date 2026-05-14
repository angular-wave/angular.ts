import { _log } from "../../injection-tokens.ts";
import {
  isRealtimeProtocolMessage,
  type RealtimeProtocolMessage,
} from "../../directive/realtime/protocol.ts";
import { isFunction, isNumber, isString } from "../../shared/utils.ts";
import type { LogService } from "../log/log.ts";

export type WebTransportBufferInput =
  | string
  | ArrayBuffer
  | ArrayBufferView
  | Uint8Array;

export interface WebTransportCertificateHash {
  algorithm: "sha-256" | "SHA-256";
  value: BufferSource;
}

export interface WebTransportOptions {
  allowPooling?: boolean;
  congestionControl?: "default" | "throughput" | "low-latency";
  requireUnreliable?: boolean;
  serverCertificateHashes?: WebTransportCertificateHash[];
}

export interface NativeWebTransport {
  readonly ready: Promise<void>;
  readonly closed: Promise<unknown>;
  readonly datagrams: {
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
  };
  readonly incomingUnidirectionalStreams?: ReadableStream<
    ReadableStream<Uint8Array>
  >;
  close(closeInfo?: { closeCode?: number; reason?: string }): void;
  createBidirectionalStream(): Promise<{
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
  }>;
  createUnidirectionalStream(): Promise<
    WritableStream<Uint8Array> | { writable: WritableStream<Uint8Array> }
  >;
}

type NativeWebTransportConstructor = new (
  url: string,
  options?: WebTransportOptions,
) => NativeWebTransport;

/** Event emitted for each incoming WebTransport datagram. */
export interface WebTransportDatagramEvent<T = unknown> {
  /** Raw bytes received from the browser WebTransport datagram stream. */
  data: Uint8Array;
  /** Value after `transformDatagram`, or the raw bytes when no transform is configured. */
  message: T;
}

/** Delay, in milliseconds, before a reconnect attempt is opened. */
export type WebTransportRetryDelay =
  | number
  | ((attempt: number, error?: unknown) => number);

/** Event passed to WebTransport reconnect and renegotiation hooks. */
export interface WebTransportReconnectEvent {
  /** Stable managed connection whose native `transport` was reopened. */
  connection: WebTransportConnection;
  /** One-based reconnect attempt count for this connection. */
  attempt: number;
  /** Error or close reason that caused the reconnect attempt, when available. */
  error?: unknown;
  /** URL used to open the replacement WebTransport session. */
  url: string;
}

/** Options passed to `$webTransport`. */
export interface WebTransportConfig extends WebTransportOptions {
  /** Called whenever the current native transport resolves `ready`. */
  onOpen?: () => void;
  /** Called when the managed connection closes without another reconnect. */
  onClose?: () => void;
  /** Called when opening, reading, writing, or closing fails. */
  onError?: (error: unknown) => void;
  /** Called with each incoming datagram. */
  onDatagram?: (event: WebTransportDatagramEvent) => void;
  /** Called when a decoded datagram uses the realtime protocol shape. */
  onProtocolMessage?: (
    message: RealtimeProtocolMessage,
    event: WebTransportDatagramEvent<RealtimeProtocolMessage>,
  ) => void;
  /** Converts incoming datagram bytes into the value passed as `event.message`. */
  transformDatagram?: (data: Uint8Array) => unknown;
  /** Reopen the native WebTransport session when it closes unexpectedly. */
  reconnect?: boolean;
  /** Delay before each reconnect attempt. Defaults to 1000ms. */
  retryDelay?: WebTransportRetryDelay;
  /** Maximum reconnect attempts before `closed` settles. Defaults to no limit. */
  maxRetries?: number;
  /** Called after a replacement session is ready so callers can renegotiate state. */
  onReconnect?: (event: WebTransportReconnectEvent) => void | Promise<void>;
}

/**
 * Managed WebTransport connection returned by `$webTransport`.
 *
 * The connection wraps the browser-native `WebTransport` object and keeps its
 * promise/stream model visible while adding small conveniences for sending
 * bytes, text, datagrams, and unidirectional streams.
 */
export interface WebTransportConnection {
  /** Resolves after the current native WebTransport session is ready. */
  ready: Promise<WebTransportConnection>;
  /** Resolves or rejects when the managed connection closes permanently. */
  closed: Promise<void>;
  /** Current browser-native WebTransport instance. Replaced after reconnects. */
  transport: NativeWebTransport;
  /** Send one unreliable datagram. */
  sendDatagram(data: WebTransportBufferInput): Promise<void>;
  /** Send UTF-8 text as one unreliable datagram. */
  sendText(data: string): Promise<void>;
  /** Send data on a client-opened reliable unidirectional stream. */
  sendStream(data: WebTransportBufferInput): Promise<void>;
  /** Open a reliable bidirectional stream. */
  createBidirectionalStream(): Promise<{
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
  }>;
  /** Close the WebTransport session. */
  close(closeInfo?: { closeCode?: number; reason?: string }): void;
}

/** Factory function exposed as `$webTransport`. */
export type WebTransportService = (
  url: string,
  config?: WebTransportConfig,
) => WebTransportConnection;

class ManagedWebTransportConnection implements WebTransportConnection {
  static $nonscope = true;

  ready!: Promise<WebTransportConnection>;
  closed: Promise<void>;
  transport!: NativeWebTransport;

  private readonly _url: string;
  private readonly _TransportCtor: NativeWebTransportConstructor;
  private readonly _transportOptions: WebTransportOptions;
  private readonly _config: WebTransportConfig;
  private readonly _log: LogService;
  private readonly _encoder = new TextEncoder();
  private _closing = false;
  private _closedSettled = false;
  private _closedResolve!: () => void;
  private _closedReject!: (error: unknown) => void;
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    url: string,
    TransportCtor: NativeWebTransportConstructor,
    transportOptions: WebTransportOptions,
    config: WebTransportConfig,
    log: LogService,
  ) {
    this._url = url;
    this._TransportCtor = TransportCtor;
    this._transportOptions = transportOptions;
    this._config = config;
    this._log = log;
    this.closed = new Promise<void>((resolve, reject) => {
      this._closedResolve = resolve;
      this._closedReject = reject;
    });
    this._open();
  }

  async sendDatagram(data: WebTransportBufferInput): Promise<void> {
    await this.transport.ready;
    const writer = this.transport.datagrams.writable.getWriter();

    try {
      await writer.write(this._toBytes(data));
    } finally {
      writer.releaseLock();
    }
  }

  sendText(data: string): Promise<void> {
    return this.sendDatagram(data);
  }

  async sendStream(data: WebTransportBufferInput): Promise<void> {
    await this.transport.ready;
    const stream = await this.transport.createUnidirectionalStream();

    const writable = "writable" in stream ? stream.writable : stream;

    const writer = writable.getWriter();

    try {
      await writer.write(this._toBytes(data));
      await writer.close();
    } finally {
      writer.releaseLock();
    }
  }

  async createBidirectionalStream(): Promise<{
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
  }> {
    await this.transport.ready;

    return this.transport.createBidirectionalStream();
  }

  close(closeInfo?: { closeCode?: number; reason?: string }): void {
    this._closing = true;
    this._clearReconnectTimer();

    try {
      this.transport.close(closeInfo);
    } catch {
      this._settleClosed();
    }
  }

  private _open(attempt = 0, previousError?: unknown): void {
    let transport: NativeWebTransport;

    try {
      transport = new this._TransportCtor(this._url, this._transportOptions);
    } catch (error) {
      this._handleNativeClose(error);
      this.ready = Promise.reject(
        error instanceof Error
          ? error
          : new Error("Failed to open WebTransport", { cause: error }),
      );

      return;
    }

    this.transport = transport;
    this.ready = transport.ready.then(
      async () => {
        void this._readDatagrams(transport);

        if (attempt > 0) {
          await this._notifyReconnect(attempt, previousError);
        }

        if (this._closing || this._closedSettled) return this;

        this._config.onOpen?.();

        return this;
      },
      (error: unknown) => {
        this._handleNativeClose(error, transport);
        throw error;
      },
    );

    transport.closed.then(
      () => {
        this._handleNativeClose(undefined, transport);
      },
      (error: unknown) => {
        this._handleNativeClose(error, transport);
      },
    );
  }

  private async _notifyReconnect(
    attempt: number,
    error?: unknown,
  ): Promise<void> {
    if (!this._config.onReconnect) return;

    try {
      await this._config.onReconnect({
        attempt,
        connection: this,
        error,
        url: this._url,
      });
    } catch (nextError) {
      if (this._closing || this._closedSettled) return;

      this._config.onError?.(nextError);
      this._log.error("WebTransport reconnect hook failed", nextError);
    }
  }

  private _handleNativeClose(
    error?: unknown,
    transport = this.transport,
  ): void {
    if (transport !== this.transport || this._closedSettled) return;

    if (this._closing) {
      this._config.onClose?.();
      this._settleClosed();

      return;
    }

    if (this._config.reconnect && this._scheduleReconnect(error)) {
      return;
    }

    if (error) {
      this._config.onError?.(error);
      this._settleClosed(error);

      return;
    }

    this._config.onClose?.();
    this._settleClosed();
  }

  private _scheduleReconnect(error?: unknown): boolean {
    if (this._closedSettled || !this._config.reconnect) return false;

    const maxRetries = this._config.maxRetries ?? Infinity;

    if (this._reconnectAttempts >= maxRetries) return false;

    const attempt = ++this._reconnectAttempts;

    const delay = this._resolveRetryDelay(attempt, error);

    this._clearReconnectTimer();
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = undefined;
      this._open(attempt, error);
    }, delay);

    return true;
  }

  private _resolveRetryDelay(attempt: number, error?: unknown): number {
    const retryDelay = this._config.retryDelay ?? 1000;

    const delay = isFunction(retryDelay)
      ? retryDelay(attempt, error)
      : retryDelay;

    return isNumber(delay) && Number.isFinite(delay) && delay > 0 ? delay : 0;
  }

  private _settleClosed(error?: unknown): void {
    if (this._closedSettled) return;

    this._closedSettled = true;
    this._clearReconnectTimer();

    if (error) {
      this._closedReject(error);
    } else {
      this._closedResolve();
    }
  }

  private _clearReconnectTimer(): void {
    if (!this._reconnectTimer) return;

    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = undefined;
  }

  private async _readDatagrams(transport: NativeWebTransport): Promise<void> {
    if (!this._config.onDatagram && !this._config.onProtocolMessage) return;

    const reader = transport.datagrams.readable.getReader();

    try {
      for (;;) {
        const result = await reader.read();

        if (result.done) return;

        const data = result.value;

        let message: unknown;

        try {
          message = this._config.transformDatagram
            ? this._config.transformDatagram(data)
            : data;
        } catch (error) {
          this._config.onError?.(error);
          this._log.error("WebTransport datagram transform failed", error);

          continue;
        }

        const event = { data, message };

        if (isRealtimeProtocolMessage(message)) {
          this._config.onProtocolMessage?.(
            message,
            event as WebTransportDatagramEvent<RealtimeProtocolMessage>,
          );
        }

        this._config.onDatagram?.(event);
      }
    } catch (error) {
      if (
        this._closing ||
        this._closedSettled ||
        (this._config.reconnect && transport === this.transport)
      ) {
        return;
      }

      this._config.onError?.(error);
      this._log.error("WebTransport datagram read failed", error);
    } finally {
      reader.releaseLock();
    }
  }

  private _toBytes(data: WebTransportBufferInput): Uint8Array {
    if (isString(data)) {
      return this._encoder.encode(data);
    }

    if (data instanceof Uint8Array) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }

    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
}

/** Provider for the `$webTransport` service. */
export class WebTransportProvider {
  /** Default options merged into every `$webTransport` call. */
  defaults: WebTransportConfig = {};

  /**
   * Returns a factory that opens browser-native WebTransport sessions.
   */
  $get = [
    _log,
    (log: ng.LogService): WebTransportService => {
      return (url: string, config: WebTransportConfig = {}) => {
        validateWebTransportUrl(url);

        const WebTransportCtor = (
          globalThis as typeof globalThis & {
            WebTransport?: NativeWebTransportConstructor;
          }
        ).WebTransport;

        if (!isFunction(WebTransportCtor)) {
          throw new Error("WebTransport API is not available in this browser");
        }

        const mergedConfig = { ...this.defaults, ...config };

        const {
          onOpen,
          onClose,
          onError,
          onDatagram,
          onProtocolMessage,
          transformDatagram,
          reconnect,
          retryDelay,
          maxRetries,
          onReconnect,
          ...transportOptions
        } = mergedConfig;

        return new ManagedWebTransportConnection(
          url,
          WebTransportCtor,
          transportOptions,
          {
            onOpen,
            onClose,
            onError,
            onDatagram,
            onProtocolMessage,
            transformDatagram,
            reconnect,
            retryDelay,
            maxRetries,
            onReconnect,
          },
          log,
        );
      };
    },
  ];
}

function validateWebTransportUrl(url: string): void {
  if (!isString(url) || !url) {
    throw new Error("WebTransport URL required");
  }

  const parsed = new URL(url, window.location.href);

  if (parsed.protocol !== "https:") {
    throw new Error("WebTransport URL must use https");
  }

  if (!parsed.port) {
    throw new Error("WebTransport URL must include an explicit port");
  }
}
