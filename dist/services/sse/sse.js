import { _log } from '../../injection-tokens.js';
import { entries } from '../../shared/utils.js';
import { StreamConnection } from '../stream/stream.js';

class SseProvider {
    /**
     * Creates the SSE provider with default reconnect and message parsing behavior.
     */
    constructor() {
        /**
         * Returns the `$sse` connection factory bound to the configured defaults.
         */
        this.$get = [
            _log,
            (log) => {
                this._$log = log;
                return (url, config = {}) => {
                    const mergedConfig = { ...this.defaults, ...config };
                    const finalUrl = this._buildUrl(url, mergedConfig.params);
                    return new StreamConnection(() => new EventSource(finalUrl, {
                        withCredentials: !!mergedConfig.withCredentials,
                    }), {
                        ...mergedConfig,
                        onMessage: (data, event) => {
                            // Cast Event -> MessageEvent safely
                            mergedConfig.onMessage?.(data, event);
                        },
                    }, this._$log);
                };
            },
        ];
        this.defaults = {
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
        };
    }
    /**
     * Builds a URL with serialized query parameters.
     */
    /** @internal */
    _buildUrl(url, params) {
        if (!params)
            return url;
        const query = entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
        return url + (url.includes("?") ? "&" : "?") + query;
    }
}

export { SseProvider };
