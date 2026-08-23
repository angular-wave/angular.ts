import { isFunction, isInstanceOf, isString } from '../../shared/utils.js';

/**
 * Shared connection manager for push transports such as SSE and WebSocket.
 * Handles reconnect, heartbeat, and event callbacks.
 */
/**
 * @internal
 */
class ConnectionManager {
    constructor(createFn, config, log, exceptionHandler) {
        this._createFn = createFn;
        this._config = {
            retryDelay: 1000,
            maxRetries: Infinity,
            heartbeatTimeout: 15000,
            transformMessage: (data) => {
                try {
                    return JSON.parse(data);
                }
                catch {
                    return data;
                }
            },
            ...config,
        };
        this._log = log;
        this._exceptionHandler = exceptionHandler;
        this._retryCount = 0;
        this._closed = false;
        this._heartbeatTimer = undefined;
        this._connection = null;
        this.reconnect();
    }
    reconnect() {
        if (this._closed)
            return;
        if (this._connection && isFunction(this._connection.close)) {
            this._connection.close();
        }
        this._connection = this._createFn();
        this._bindEvents();
    }
    send(data) {
        if (isInstanceOf(this._connection, WebSocket)) {
            this._connection.send(JSON.stringify(data));
        }
        else {
            this._log.warn("Send is only supported on WebSocket connections");
        }
    }
    close() {
        this._closed = true;
        clearTimeout(this._heartbeatTimer);
        if (this._connection?.close) {
            this._connection.close();
        }
    }
    /** @internal */
    _bindEvents() {
        const conn = this._connection;
        if (isInstanceOf(conn, EventSource)) {
            conn.addEventListener("open", (err) => {
                this._handleOpen(err);
            });
            conn.addEventListener("message", (err) => {
                this._handleMessage(err.data, err);
            });
            this._config.eventTypes?.forEach((eventType) => {
                if (eventType === "message")
                    return;
                conn.addEventListener(eventType, (event) => {
                    const messageEvent = event;
                    this._handleMessage(messageEvent.data, messageEvent);
                });
            });
            conn.addEventListener("error", (err) => {
                this._handleError(err);
            });
        }
        else if (isInstanceOf(conn, WebSocket)) {
            conn.onopen = (err) => {
                this._handleOpen(err);
            };
            conn.onmessage = (err) => {
                this._handleMessage(err.data, err);
            };
            conn.onerror = (err) => {
                this._handleError(err);
            };
            conn.onclose = (event) => {
                this._handleClose(event);
            };
        }
    }
    /** @internal */
    _handleOpen(event) {
        this._retryCount = 0;
        try {
            this._invokeCallback(this._config.onOpen, event);
        }
        finally {
            this._resetHeartbeat();
        }
    }
    /** @internal */
    _handleMessage(data, event) {
        const rawData = data;
        let transformedData = data;
        try {
            transformedData = isString(data)
                ? (this._config.transformMessage(data) ?? data)
                : data;
        }
        catch (error) {
            this._exceptionHandler(error);
        }
        try {
            this._invokeCallback(this._config.onEvent, {
                type: event.type || "message",
                data: transformedData,
                rawData,
                event,
            });
            this._invokeCallback(this._config.onMessage, transformedData, event);
        }
        finally {
            this._resetHeartbeat();
        }
    }
    /** @internal */
    _handleError(err) {
        try {
            this._invokeCallback(this._config.onError, err);
        }
        finally {
            this._scheduleReconnect();
        }
    }
    /** @internal */
    _handleClose(event) {
        try {
            this._invokeCallback(this._config.onClose, event);
        }
        finally {
            this._scheduleReconnect();
        }
    }
    /** @internal */
    _scheduleReconnect() {
        if (this._closed)
            return;
        if (this._retryCount < this._config.maxRetries) {
            this._retryCount++;
            try {
                this._invokeCallback(this._config.onReconnect, this._retryCount);
            }
            finally {
                setTimeout(() => {
                    try {
                        this.reconnect();
                    }
                    catch (error) {
                        this._exceptionHandler(error);
                    }
                }, this._config.retryDelay);
            }
        }
        else {
            this._log.warn("ConnectionManager: Max retries reached");
        }
    }
    /** @internal */
    _resetHeartbeat() {
        if (!this._config.heartbeatTimeout)
            return;
        clearTimeout(this._heartbeatTimer);
        this._heartbeatTimer = setTimeout(() => {
            this._log.warn("ConnectionManager: heartbeat timeout, reconnecting...");
            this._closeForReconnect();
            this._scheduleReconnect();
        }, this._config.heartbeatTimeout);
    }
    /** @internal */
    _closeForReconnect() {
        clearTimeout(this._heartbeatTimer);
        if (isInstanceOf(this._connection, WebSocket)) {
            this._connection.onopen = null;
            this._connection.onmessage = null;
            this._connection.onerror = null;
            this._connection.onclose = null;
        }
        this._connection?.close();
    }
    /** @internal */
    _invokeCallback(callback, ...args) {
        if (!callback)
            return;
        try {
            callback(...args);
        }
        catch (error) {
            this._exceptionHandler(error);
        }
    }
}

export { ConnectionManager };
