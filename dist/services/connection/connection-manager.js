import { isFunction, isInstanceOf } from '../../shared/utils.js';

/**
 * Shared connection manager for push transports such as SSE and WebSocket.
 * Handles reconnect, heartbeat, and event callbacks.
 */
/**
 * @internal
 */
class ConnectionManager {
    constructor(createFn, config = {}, log = console) {
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
        this._retryCount = 0;
        this._closed = false;
        this._heartbeatTimer = undefined;
        this._connection = null;
        this.connect();
    }
    connect() {
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
        if (this._connection && this._connection.close) {
            this._connection.close();
        }
    }
    /** @internal */
    _bindEvents() {
        const conn = this._connection;
        if (isInstanceOf(conn, EventSource)) {
            conn.addEventListener("open", (err) => this._handleOpen(err));
            conn.addEventListener("message", (err) => this._handleMessage(err.data, err));
            this._config.eventTypes?.forEach((eventType) => {
                if (eventType === "message")
                    return;
                conn.addEventListener(eventType, (event) => {
                    const messageEvent = event;
                    this._handleMessage(messageEvent.data, messageEvent);
                });
            });
            conn.addEventListener("error", (err) => this._handleError(err));
        }
        else if (isInstanceOf(conn, WebSocket)) {
            conn.onopen = (err) => this._handleOpen(err);
            conn.onmessage = (err) => this._handleMessage(err.data, err);
            conn.onerror = (err) => this._handleError(err);
            conn.onclose = (event) => this._handleClose(event);
        }
    }
    /** @internal */
    _handleOpen(event) {
        this._retryCount = 0;
        this._config.onOpen?.(event);
        this._resetHeartbeat();
    }
    /** @internal */
    _handleMessage(data, event) {
        const rawData = data;
        try {
            data = this._config.transformMessage?.(data) ?? data;
        }
        catch {
            /* empty */
        }
        this._config.onEvent?.({
            type: event.type || "message",
            data,
            rawData,
            event,
        });
        this._config.onMessage?.(data, event);
        this._resetHeartbeat();
    }
    /** @internal */
    _handleError(err) {
        this._config.onError?.(err);
        this._scheduleReconnect();
    }
    /** @internal */
    _handleClose(event) {
        this._config.onClose?.(event);
        this._scheduleReconnect();
    }
    /** @internal */
    _scheduleReconnect() {
        if (this._closed)
            return;
        if (this._retryCount < this._config.maxRetries) {
            this._retryCount++;
            this._config.onReconnect?.(this._retryCount);
            setTimeout(() => this.connect(), this._config.retryDelay);
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
            this._closeInternal();
            this._retryCount++;
            this._config.onReconnect?.(this._retryCount);
            this.connect();
        }, this._config.heartbeatTimeout);
    }
    /** @internal */
    _closeInternal() {
        clearTimeout(this._heartbeatTimer);
        this._connection?.close();
    }
}

export { ConnectionManager };
