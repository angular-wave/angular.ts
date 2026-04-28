import { _angularProvider } from '../../injection-tokens.js';
import { ParamTypes } from '../params/param-types.js';
import { isNullOrUndefined, isDefined, isString } from '../../shared/utils.js';

/**
 * An API to customize the URL behavior and retrieve URL configuration
 *
 * This API is used to customize the behavior of the URL.
 * This includes optional trailing slashes ([[strictMode]]), case sensitivity ([[caseInsensitive]]),
 * and custom parameter encoding (custom [[type]]).
 *
 * It also has information about the location (url) configuration such as [[port]] and [[baseHref]].
 * This information can be used to build absolute URLs, such as
 * `https://example.com:443/basepath/state/substate?param1=a#hashvalue`;
 *
 * This API is found at `$url.config`.
 */
class UrlConfigProvider {
    /**
     * @param {ng.AngularServiceProvider} $angularProvider
     */
    constructor($angularProvider) {
        this.$get = () => this;
        this.paramTypes = new ParamTypes($angularProvider.$get());
        this._isCaseInsensitive = false;
        this._isStrictMode = true;
        this._defaultSquashPolicy = false;
        /**
         * Applies path parameter encoding
         *
         * The `$location` service does not allow slashes to be encoded/decoded bi-directionally.
         *
         * This code patches the `path` parameter type so it encoded/decodes slashes as ~2F
         *
         */
        const pathType = this.type("path");
        pathType.encode = (x) => !isNullOrUndefined(x)
            ? x
                .toString()
                .replace(/([~/])/g, (i) => (i === "~" ? "~~" : "~2F"))
            : x;
        pathType.decode = (x) => !isNullOrUndefined(x)
            ? x
                .toString()
                .replace(/(~~|~2F)/g, (i) => (i === "~~" ? "~" : "/"))
            : x;
        this.paramTypes.enqueue = false;
        this.paramTypes._flushTypeQueue();
    }
    /**
     * Defines whether URL matching should be case sensitive (the default behavior), or not.
     *
     * #### Example:
     * ```js
     * // Allow case insensitive url matches
     * urlService.config.caseInsensitive(true);
     * ```
     * @param {boolean} [value] `false` to match URL in a case sensitive manner; otherwise `true`;
     * @returns {boolean} the current value of caseInsensitive
     */
    caseInsensitive(value) {
        return (this._isCaseInsensitive = isDefined(value)
            ? value
            : this._isCaseInsensitive);
    }
    /**
     * Sets the default behavior when generating or matching URLs with default parameter values.
     *
     * #### Example:
     * ```js
     * // Remove default parameter values from the url
     * urlService.config.defaultSquashPolicy(true);
     * ```
     *
     * @param {boolean | string} [value] A string that defines the default parameter URL squashing behavior.
     *    - `nosquash`: When generating an href with a default parameter value, do not squash the parameter value from the URL
     *    - `slash`: When generating an href with a default parameter value, squash (remove) the parameter value, and, if the
     *      parameter is surrounded by slashes, squash (remove) one slash from the URL
     *    - any other string, e.g. "~": When generating an href with a default parameter value, squash (remove)
     *      the parameter value from the URL and replace it with this string.
     * @returns {boolean | string} the current value of defaultSquashPolicy
     */
    defaultSquashPolicy(value) {
        if (isDefined(value) &&
            value !== true &&
            value !== false &&
            !isString(value))
            throw new Error(`Invalid squash policy: ${value}. Valid policies: false, true, arbitrary-string`);
        return (this._defaultSquashPolicy = isDefined(value)
            ? value
            : this._defaultSquashPolicy);
    }
    /**
     * Defines whether URLs should match trailing slashes, or not (the default behavior).
     *
     * #### Example:
     * ```js
     * // Allow optional trailing slashes
     * urlService.config.strictMode(false);
     * ```
     *
     * @param {boolean} value `false` to match trailing slashes in URLs, otherwise `true`.
     * @returns {boolean} the current value of strictMode
     */
    strictMode(value) {
        return (this._isStrictMode = isDefined(value) ? value : this._isStrictMode);
    }
    type(name, definition, definitionFn) {
        if (!isDefined(definition)) {
            return this.paramTypes.type(name);
        }
        this.paramTypes.type(name, definition, definitionFn);
        return this;
    }
}
UrlConfigProvider.$inject = [_angularProvider];

export { UrlConfigProvider };
