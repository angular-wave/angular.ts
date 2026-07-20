import { entries } from '../../shared/utils.js';
import { ConnectionManager } from '../connection/connection-manager.js';

/** @internal */
function createSseRuntimeConfiguration() {
    return {
        defaults: {
            retryDelay: 1000,
            maxRetries: Infinity,
            heartbeatTimeout: 15000,
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
function applySseConfiguration(configuration, config) {
    if (config.defaults !== undefined) {
        configuration.defaults = {
            ...configuration.defaults,
            ...config.defaults,
        };
    }
}
/** @internal */
function destroySseRuntimeConfiguration(configuration) {
    if (configuration.destroyed)
        return;
    configuration.destroyed = true;
    for (const connection of configuration.connections)
        connection.close();
    configuration.connections.clear();
}
/** @internal */
function createSseService(log, configuration, getEventSourceConstructor) {
    return (url, config = {}) => {
        if (configuration.destroyed) {
            throw new Error("Cannot create an SSE connection after runtime teardown");
        }
        const mergedConfig = { ...configuration.defaults, ...config };
        const finalUrl = buildUrl(url, mergedConfig.params);
        const manager = new ConnectionManager(() => {
            const EventSourceConstructor = getEventSourceConstructor();
            return new EventSourceConstructor(finalUrl, {
                withCredentials: !!mergedConfig.withCredentials,
            });
        }, {
            ...mergedConfig,
            onMessage: (data, event) => {
                mergedConfig.onMessage?.(data, event);
            },
        }, log);
        let closed = false;
        const connection = {
            reconnect() {
                manager.reconnect();
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
function buildUrl(url, params) {
    if (!params)
        return url;
    const query = entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(serializeQueryValue(value))}`)
        .join("&");
    return url + (url.includes("?") ? "&" : "?") + query;
}
function serializeQueryValue(value) {
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
        case "object":
            return value === null ? "" : JSON.stringify(value);
        case "function":
            return JSON.stringify(value);
    }
    return "";
}

export { applySseConfiguration, createSseRuntimeConfiguration, createSseService, destroySseRuntimeConfiguration };
