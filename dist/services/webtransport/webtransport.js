import { isRealtimeProtocolMessage } from '../../directive/realtime/protocol.js';
import { isFunction, isString, isInstanceOf, isNumber } from '../../shared/utils.js';

/** @internal */
function createWebTransportRuntimeConfiguration() {
    return {
        defaults: {},
        connections: new Set(),
        destroyed: false,
    };
}
/** @internal */
function applyWebTransportConfiguration(configuration, config) {
    if (config.defaults !== undefined) {
        configuration.defaults = {
            ...configuration.defaults,
            ...config.defaults,
        };
    }
}
/** @internal */
function destroyWebTransportRuntimeConfiguration(configuration) {
    if (configuration.destroyed)
        return;
    configuration.destroyed = true;
    for (const connection of configuration.connections)
        connection.close();
    configuration.connections.clear();
}
class ManagedWebTransportConnection {
    constructor(url, TransportCtor, transportOptions, config, log, exceptionHandler) {
        this._encoder = new TextEncoder();
        this._closing = false;
        this._closedSettled = false;
        this._reconnectAttempts = 0;
        this._url = url;
        this._TransportCtor = TransportCtor;
        this._transportOptions = transportOptions;
        this._config = config;
        this._log = log;
        this._exceptionHandler = exceptionHandler;
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
    async sendText(data) {
        return this.sendDatagram(data);
    }
    async sendStream(data) {
        await this.transport.ready;
        const stream = await this.transport.createUnidirectionalStream();
        const writer = stream.getWriter();
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
        if (this._closing || this._closedSettled)
            return;
        this._closing = true;
        this._clearReconnectTimer();
        try {
            this.transport.close(closeInfo);
        }
        catch {
            this._settleClosed();
        }
    }
    /** @internal */
    _open(attempt = 0, previousError) {
        let transport;
        try {
            transport = new this._TransportCtor(this._url, this._transportOptions);
        }
        catch (error) {
            this._handleNativeClose(error);
            this.ready = Promise.reject(isInstanceOf(error, Error)
                ? error
                : new Error("Failed to open WebTransport", { cause: error }));
            return;
        }
        this.transport = transport;
        this.ready = transport.ready.then(async () => {
            void this._readDatagrams(transport);
            if (attempt > 0) {
                await this._notifyReconnect(attempt, previousError);
            }
            if (this._closing || this._closedSettled)
                return this;
            this._config.onOpen?.();
            return this;
        }, (error) => {
            this._handleNativeClose(error, transport);
            throw error;
        });
        void transport.closed.then(() => {
            this._handleNativeClose(undefined, transport);
            return undefined;
        }, (error) => {
            this._handleNativeClose(error, transport);
        });
    }
    /** @internal */
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
            if (this._closing || this._closedSettled)
                return;
            this._notifyError(nextError);
            this._log.error("WebTransport reconnect hook failed", nextError);
        }
    }
    /** @internal */
    _handleNativeClose(error, transport = this.transport) {
        if (transport !== this.transport || this._closedSettled)
            return;
        if (this._closing) {
            try {
                this._invokeDetached(this._config.onClose);
            }
            finally {
                this._settleClosed();
            }
            return;
        }
        if (this._config.reconnect && this._scheduleReconnect(error)) {
            return;
        }
        if (error) {
            try {
                this._notifyError(error);
            }
            finally {
                this._settleClosed(error);
            }
            return;
        }
        try {
            this._invokeDetached(this._config.onClose);
        }
        finally {
            this._settleClosed();
        }
    }
    /** @internal */
    _scheduleReconnect(error) {
        if (this._closedSettled || !this._config.reconnect)
            return false;
        const maxRetries = this._config.maxRetries ?? Infinity;
        if (this._reconnectAttempts >= maxRetries)
            return false;
        const attempt = ++this._reconnectAttempts;
        let delay = 0;
        try {
            delay = this._resolveRetryDelay(attempt, error);
        }
        catch (retryError) {
            this._exceptionHandler(retryError);
        }
        this._clearReconnectTimer();
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = undefined;
            this._open(attempt, error);
        }, delay);
        return true;
    }
    /** @internal */
    _resolveRetryDelay(attempt, error) {
        const retryDelay = this._config.retryDelay ?? 1000;
        const delay = isFunction(retryDelay)
            ? retryDelay(attempt, error)
            : retryDelay;
        return isNumber(delay) && Number.isFinite(delay) && delay > 0 ? delay : 0;
    }
    /** @internal */
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
    /** @internal */
    _clearReconnectTimer() {
        if (!this._reconnectTimer)
            return;
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = undefined;
    }
    /** @internal */
    async _readDatagrams(transport) {
        if (!this._config.onDatagram && !this._config.onProtocolMessage)
            return;
        const reader = transport.datagrams.readable.getReader();
        try {
            for (;;) {
                let result;
                try {
                    result = await reader.read();
                }
                catch (error) {
                    if (this._closing ||
                        this._closedSettled ||
                        (this._config.reconnect && transport === this.transport)) {
                        return;
                    }
                    this._notifyError(error);
                    this._log.error("WebTransport datagram read failed", error);
                    return;
                }
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
                    this._notifyError(error);
                    this._log.error("WebTransport datagram transform failed", error);
                    continue;
                }
                const event = { data, message };
                if (isRealtimeProtocolMessage(message)) {
                    this._invokeDetached(this._config.onProtocolMessage, message, event);
                }
                this._invokeDetached(this._config.onDatagram, event);
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /** @internal */
    _toBytes(data) {
        if (isString(data)) {
            return this._encoder.encode(data);
        }
        if (isInstanceOf(data, Uint8Array)) {
            return data;
        }
        if (isInstanceOf(data, ArrayBuffer)) {
            return new Uint8Array(data);
        }
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    /** @internal */
    _notifyError(error) {
        this._invokeDetached(this._config.onError, error);
    }
    /** @internal */
    _invokeDetached(callback, ...args) {
        if (!callback)
            return;
        try {
            callback(...args);
        }
        catch (callbackError) {
            this._exceptionHandler(callbackError);
        }
    }
}
ManagedWebTransportConnection.$nonscope = true;
/** @internal */
function createWebTransportService(log, configuration, getWebTransportConstructor, baseUrl, exceptionHandler) {
    return (url, config = {}) => {
        if (configuration.destroyed) {
            throw new Error("Cannot create a WebTransport connection after runtime teardown");
        }
        validateWebTransportUrl(url, baseUrl);
        const WebTransportCtor = getWebTransportConstructor();
        if (!isFunction(WebTransportCtor)) {
            throw new Error("WebTransport API is not available in this browser");
        }
        const mergedConfig = { ...configuration.defaults, ...config };
        const { onOpen, onClose, onError, onDatagram, onProtocolMessage, transformDatagram, reconnect, retryDelay, maxRetries, onReconnect, ...transportOptions } = mergedConfig;
        const connection = new ManagedWebTransportConnection(url, WebTransportCtor, transportOptions, {
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
        }, log, exceptionHandler);
        const release = () => {
            configuration.connections.delete(connection);
        };
        configuration.connections.add(connection);
        void connection.closed.then(release, release);
        return connection;
    };
}
function validateWebTransportUrl(url, baseUrl) {
    if (!isString(url) || !url) {
        throw new Error("WebTransport URL required");
    }
    const parsed = new URL(url, baseUrl);
    if (parsed.protocol !== "https:") {
        throw new Error("WebTransport URL must use https");
    }
    if (!parsed.port) {
        throw new Error("WebTransport URL must include an explicit port");
    }
}

export { applyWebTransportConfiguration, createWebTransportRuntimeConfiguration, createWebTransportService, destroyWebTransportRuntimeConfiguration };
