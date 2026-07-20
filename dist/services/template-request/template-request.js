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
    return async (templateUrl) => {
        let transformResponse = $http.defaults.transformResponse ?? null;
        if (isArray(transformResponse)) {
            transformResponse = transformResponse.filter((transform) => transform !== defaultHttpResponseTransform);
        }
        else if (transformResponse === defaultHttpResponseTransform) {
            transformResponse = null;
        }
        const config = extend({
            cache: $templateCache,
            transformResponse,
        }, httpOptions);
        return $http.get(templateUrl, config).then((response) => {
            $templateCache.set(templateUrl, response.data);
            return response.data;
        });
    };
}

export { applyTemplateRequestConfig, createTemplateRequestHttpOptions, createTemplateRequestService };
