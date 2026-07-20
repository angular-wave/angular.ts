import { ConnectionManager } from '../connection/connection-manager.js';
import { isRealtimeProtocolMessage } from '../../directive/realtime/protocol.js';

/** @internal */
function createWebSocketRuntimeConfiguration() {
    return {
        defaults: {
            protocols: [],
            retryDelay: 1000,
            maxRetries: Infinity,
            heartbeatTimeout: 0,
            transformMessage(data) {
                try {
                    return JSON.parse(data);
                }
                catch {
                    return data;
                }
            },
        },
        connections: new Set(),
        destroyed: false,
    };
}
/** @internal */
function applyWebSocketConfiguration(configuration, config) {
    if (config.defaults !== undefined) {
        configuration.defaults = {
            ...configuration.defaults,
            ...config.defaults,
        };
    }
}
/** @internal */
function destroyWebSocketRuntimeConfiguration(configuration) {
    if (configuration.destroyed)
        return;
    configuration.destroyed = true;
    for (const connection of configuration.connections)
        connection.close();
    configuration.connections.clear();
}
/** @internal */
function createWebSocketService(log, configuration, WebSocketConstructor) {
    return (url, config = {}) => {
        if (configuration.destroyed) {
            throw new Error("Cannot create a WebSocket connection after runtime teardown");
        }
        const mergedConfig = { ...configuration.defaults, ...config };
        const manager = new ConnectionManager(() => new WebSocketConstructor(url, mergedConfig.protocols), {
            ...mergedConfig,
            onMessage: (data, event) => {
                if (isRealtimeProtocolMessage(data)) {
                    mergedConfig.onProtocolMessage?.(data, event);
                }
                mergedConfig.onMessage?.(data, event);
            },
            onOpen: (event) => {
                mergedConfig.onOpen?.(event);
            },
            onClose: (event) => {
                mergedConfig.onClose?.(event);
            },
            onError: (event) => {
                mergedConfig.onError?.(event);
            },
        }, log);
        let closed = false;
        const connection = {
            reconnect() {
                manager.reconnect();
            },
            send(data) {
                manager.send(data);
            },
            close() {
                if (closed)
                    return;
                closed = true;
                configuration.connections.delete(connection);
                manager.close();
            },
        };
        configuration.connections.add(connection);
        return connection;
    };
}

export { applyWebSocketConfiguration, createWebSocketRuntimeConfiguration, createWebSocketService, destroyWebSocketRuntimeConfiguration };
