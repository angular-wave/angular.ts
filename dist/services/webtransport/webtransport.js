import { _log } from '../../injection-tokens.js';
import { isFunction, isString, isNumber } from '../../shared/utils.js';

class ManagedWebTransportConnection {
    constructor(url, TransportCtor, transportOptions, config, log) {
        this._encoder = new TextEncoder();
        this._closing = false;
        this._closedSettled = false;
        this._reconnectAttempts = 0;
        this._url = url;
        this._TransportCtor = TransportCtor;
        this._transportOptions = transportOptions;
        this._config = config;
        this._log = log;
        this.closed = new Promise((resolve, reject) => {
            this._closedResolve = resolve;
            this._closedReject = reject;
        });
        this._open();
    }
    async sendDatagram(data) {
        await this.transport.ready;
        const writer = this.transport.datagrams.writable.getWriter();
        try {
            await writer.write(this._toBytes(data));
        }
        finally {
            writer.releaseLock();
        }
    }
    sendText(data) {
        return this.sendDatagram(data);
    }
    async sendStream(data) {
        await this.transport.ready;
        const stream = await this.transport.createUnidirectionalStream();
        const writable = "writable" in stream ? stream.writable : stream;
        const writer = writable.getWriter();
        try {
            await writer.write(this._toBytes(data));
            await writer.close();
        }
        finally {
            writer.releaseLock();
        }
    }
    async createBidirectionalStream() {
        await this.transport.ready;
        return this.transport.createBidirectionalStream();
    }
    close(closeInfo) {
        this._closing = true;
        this._clearReconnectTimer();
        this.transport.close(closeInfo);
    }
    _open(attempt = 0, previousError) {
        let transport;
        try {
            transport = new this._TransportCtor(this._url, this._transportOptions);
        }
        catch (error) {
            this._handleNativeClose(error);
            this.ready = Promise.reject(error);
            return;
        }
        this.transport = transport;
        this.ready = transport.ready.then(async () => {
            this._readDatagrams(transport);
            if (attempt > 0) {
                await this._notifyReconnect(attempt, previousError);
            }
            this._config.onOpen?.();
            return this;
        }, (error) => {
            this._handleNativeClose(error, transport);
            throw error;
        });
        transport.closed.then(() => {
            this._handleNativeClose(undefined, transport);
        }, (error) => {
            this._handleNativeClose(error, transport);
        });
    }
    async _notifyReconnect(attempt, error) {
        if (!this._config.onReconnect)
            return;
        try {
            await this._config.onReconnect({
                attempt,
                connection: this,
                error,
                url: this._url,
            });
        }
        catch (nextError) {
            this._config.onError?.(nextError);
            this._log.error("WebTransport reconnect hook failed", nextError);
        }
    }
    _handleNativeClose(error, transport = this.transport) {
        if (transport !== this.transport || this._closedSettled)
            return;
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
    _scheduleReconnect(error) {
        if (this._closedSettled || !this._config.reconnect)
            return false;
        const maxRetries = this._config.maxRetries ?? Infinity;
        if (this._reconnectAttempts >= maxRetries)
            return false;
        const attempt = ++this._reconnectAttempts;
        const delay = this._resolveRetryDelay(attempt, error);
        this._clearReconnectTimer();
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = undefined;
            this._open(attempt, error);
        }, delay);
        return true;
    }
    _resolveRetryDelay(attempt, error) {
        const retryDelay = this._config.retryDelay ?? 1000;
        const delay = isFunction(retryDelay)
            ? retryDelay(attempt, error)
            : retryDelay;
        return isNumber(delay) && Number.isFinite(delay) && delay > 0 ? delay : 0;
    }
    _settleClosed(error) {
        if (this._closedSettled)
            return;
        this._closedSettled = true;
        this._clearReconnectTimer();
        if (error) {
            this._closedReject(error);
        }
        else {
            this._closedResolve();
        }
    }
    _clearReconnectTimer() {
        if (!this._reconnectTimer)
            return;
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = undefined;
    }
    async _readDatagrams(transport) {
        if (!this._config.onDatagram)
            return;
        const reader = transport.datagrams.readable.getReader();
        try {
            for (;;) {
                const result = await reader.read();
                if (result.done)
                    return;
                const data = result.value;
                let message;
                try {
                    message = this._config.transformDatagram
                        ? this._config.transformDatagram(data)
                        : data;
                }
                catch (error) {
                    this._config.onError?.(error);
                    this._log.error("WebTransport datagram transform failed", error);
                    continue;
                }
                this._config.onDatagram({ data, message });
            }
        }
        catch (error) {
            if (this._closing ||
                this._closedSettled ||
                (this._config.reconnect && transport === this.transport)) {
                return;
            }
            this._config.onError?.(error);
            this._log.error("WebTransport datagram read failed", error);
        }
        finally {
            reader.releaseLock();
        }
    }
    _toBytes(data) {
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
ManagedWebTransportConnection.$nonscope = true;
/** Provider for the `$webTransport` service. */
class WebTransportProvider {
    constructor() {
        /** Default options merged into every `$webTransport` call. */
        this.defaults = {};
        /**
         * Returns a factory that opens browser-native WebTransport sessions.
         */
        this.$get = [
            _log,
            (log) => {
                return (url, config = {}) => {
                    validateWebTransportUrl(url);
                    const WebTransportCtor = globalThis.WebTransport;
                    if (!isFunction(WebTransportCtor)) {
                        throw new Error("WebTransport API is not available in this browser");
                    }
                    const mergedConfig = { ...this.defaults, ...config };
                    const { onOpen, onClose, onError, onDatagram, transformDatagram, reconnect, retryDelay, maxRetries, onReconnect, ...transportOptions } = mergedConfig;
                    return new ManagedWebTransportConnection(url, WebTransportCtor, transportOptions, {
                        onOpen,
                        onClose,
                        onError,
                        onDatagram,
                        transformDatagram,
                        reconnect,
                        retryDelay,
                        maxRetries,
                        onReconnect,
                    }, log);
                };
            },
        ];
    }
}
function validateWebTransportUrl(url) {
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

export { WebTransportProvider };
