import { mergeHttpHeaderDefaults, defaultHttpResponseTransform } from '../http/http.js';
import { isString, isArray, extend } from '../../shared/utils.js';

/** @internal */
function createTemplateRequestHttpOptions() {
    return {
        headers: {
            Accept: "text/html",
        },
    };
}
/** @internal */
function applyTemplateRequestConfig(current, config) {
    const httpOptions = config.httpOptions;
    if (httpOptions === undefined)
        return current;
    const headers = httpOptions.headers;
    const currentHeaders = current.headers;
    const next = {
        ...current,
        ...httpOptions,
    };
    if (headers !== undefined) {
        next.headers = mergeHttpHeaderDefaults(currentHeaders, headers);
    }
    return next;
}
/** @internal */
function createTemplateRequestService($templateCache, $http, httpOptions, resourceUrlPolicy) {
    const pendingRequests = new Map();
    return (templateUrl, options) => {
        const signal = options?.signal;
        try {
            if (!isString(templateUrl))
                throw new TypeError("Template URL must be a string.");
            templateUrl = resourceUrlPolicy(templateUrl);
            if (!isString(templateUrl))
                throw new TypeError("$compile.resourceUrlPolicy must return a string.");
            signal?.throwIfAborted();
        }
        catch (error) {
            return Promise.resolve().then(() => {
                throw error;
            });
        }
        let pending = pendingRequests.get(templateUrl);
        if (!pending) {
            const controller = new AbortController();
            const transportSignal = httpOptions.signal
                ? AbortSignal.any([controller.signal, httpOptions.signal])
                : controller.signal;
            const entry = {
                controller,
                consumers: new Set(),
                keepAlive: false,
                finished: false,
                promise: Promise.resolve()
                    .then(async () => {
                    controller.signal.throwIfAborted();
                    const cachedTemplate = $templateCache.get(templateUrl);
                    if (cachedTemplate !== undefined)
                        return cachedTemplate;
                    let transformResponse = $http.defaults.transformResponse ?? null;
                    if (isArray(transformResponse)) {
                        transformResponse = transformResponse.filter((transform) => transform !== defaultHttpResponseTransform);
                    }
                    else if (transformResponse === defaultHttpResponseTransform) {
                        transformResponse = null;
                    }
                    const config = extend({
                        transformResponse,
                    }, httpOptions, { signal: transportSignal });
                    const response = await $http.get(templateUrl, config);
                    transportSignal.throwIfAborted();
                    $templateCache.set(templateUrl, response.data);
                    return response.data;
                })
                    .finally(() => {
                    entry.finished = true;
                    if (pendingRequests.get(templateUrl) === entry)
                        pendingRequests.delete(templateUrl);
                }),
            };
            pendingRequests.set(templateUrl, entry);
            pending = entry;
        }
        const entry = pending;
        if (!signal) {
            entry.keepAlive = true;
            return entry.promise;
        }
        return new Promise((resolve, reject) => {
            const consumer = {};
            entry.consumers.add(consumer);
            const cleanup = () => {
                signal.removeEventListener("abort", abort);
                entry.consumers.delete(consumer);
            };
            const abort = () => {
                cleanup();
                // AbortSignal reasons may be arbitrary values; preserve the native contract.
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(signal.reason);
                if (!entry.finished && !entry.keepAlive && entry.consumers.size === 0) {
                    if (pendingRequests.get(templateUrl) === entry)
                        pendingRequests.delete(templateUrl);
                    entry.controller.abort();
                }
            };
            signal.addEventListener("abort", abort, { once: true });
            void entry.promise
                .then((template) => {
                cleanup();
                resolve(template);
                return undefined;
            }, (error) => {
                cleanup();
                // HTTP can reject with a response object; keep it intact.
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(error);
                return undefined;
            })
                .catch(reject);
        });
    };
}

export { applyTemplateRequestConfig, createTemplateRequestHttpOptions, createTemplateRequestService };
