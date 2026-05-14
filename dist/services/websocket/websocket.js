import { _log } from '../../injection-tokens.js';
import { ConnectionManager } from '../connection/connection-manager.js';
import { isRealtimeProtocolMessage } from '../../directive/realtime/protocol.js';

/**
 * WebSocketProvider
 * Provides a pre-configured WebSocket connection as an injectable.
 */
class WebSocketProvider {
    /**
     * Creates the WebSocket provider with default reconnect and message parsing behavior.
     */
    constructor() {
        /**
         * Returns the `$websocket` connection factory bound to the configured defaults.
         */
        this.$get = [
            _log,
            (log) => {
                this._$log = log;
                return (url, protocols = [], config = {}) => {
                    const mergedConfig = { ...this.defaults, ...config };
                    mergedConfig.protocols = protocols.length
                        ? protocols
                        : mergedConfig.protocols;
                    return new ConnectionManager(() => new WebSocket(url, mergedConfig.protocols), {
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
                    }, this._$log);
                };
            },
        ];
        this.defaults = {
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
        };
    }
}

export { WebSocketProvider };
