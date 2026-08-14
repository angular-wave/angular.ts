import { mergeHttpHeaderDefaults, defaultHttpResponseTransform } from '../http/http.js';
import { isArray, extend } from '../../shared/utils.js';

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
function createTemplateRequestService($templateCache, $http, httpOptions) {
    const pendingRequests = new Map();
    return (templateUrl) => {
        const pendingRequest = pendingRequests.get(templateUrl);
        if (pendingRequest)
            return pendingRequest;
        const request = Promise.resolve()
            .then(async () => {
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
            }, httpOptions);
            const response = await $http.get(templateUrl, config);
            $templateCache.set(templateUrl, response.data);
            return response.data;
        })
            .finally(() => {
            pendingRequests.delete(templateUrl);
        });
        pendingRequests.set(templateUrl, request);
        return request;
    };
}

export { applyTemplateRequestConfig, createTemplateRequestHttpOptions, createTemplateRequestService };
