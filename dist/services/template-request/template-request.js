import { _templateCache, _http } from '../../injection-tokens.js';
import { defaultHttpResponseTransform } from '../http/http.js';
import { isArray, extend } from '../../shared/utils.js';

/**
 * Provider for the `$templateRequest` service.
 *
 * Fetches templates via HTTP and caches them in `$templateCache`.
 * Templates are assumed trusted.
 *
 * This provider allows configuring per-request `$http` options such as headers,
 * timeout, or transform functions via `httpOptions`.
 *
 * Option A:
 * - Provide a sensible default for template fetching (e.g. `Accept: text/html`)
 * - Keep `httpOptions` overridable during config phase
 */
class TemplateRequestProvider {
    constructor() {
        this.$get = [
            _templateCache,
            _http,
            /**
             * Creates the `$templateRequest` service.
             */
            ($templateCache, $http) => {
                /**
                 * Fetch a template via HTTP and cache it.
                 *
                 * @param templateUrl URL of the template.
                 * @returns Resolves with template content.
                 */
                const fetchTemplate = (templateUrl) => {
                    // Filter out default transformResponse for template requests
                    let transformResponse = $http.defaults.transformResponse ?? null;
                    if (isArray(transformResponse)) {
                        transformResponse = transformResponse.filter((x) => x !== defaultHttpResponseTransform);
                    }
                    else if (transformResponse === defaultHttpResponseTransform) {
                        transformResponse = null;
                    }
                    const config = extend({
                        cache: $templateCache,
                        transformResponse,
                    }, this.httpOptions);
                    return $http.get(templateUrl, config).then((response) => {
                        $templateCache.set(templateUrl, response.data);
                        return response.data;
                    });
                };
                return fetchTemplate;
            },
        ];
        /**
         * Default options for template requests.
         * Keeps behavior aligned with callers that previously used `$http` directly
         * and set `Accept: text/html`.
         */
        this.httpOptions = {
            headers: {
                Accept: "text/html",
            },
        };
    }
}

export { TemplateRequestProvider };
