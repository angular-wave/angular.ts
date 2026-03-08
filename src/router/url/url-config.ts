import { ParamTypes } from "../params/param-types.ts";
import { isDefined, isNullOrUndefined, isString } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.ts";
import type { ParamTypeDefinition } from "../params/interface.ts";
import type { ParamType } from "../params/param-type.ts";
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
 * This API is found at `router.urlService.config` (see: [[UIRouter.urlService]], [[URLService.config]])
 */
export class UrlConfigProvider {
  static $inject = [$injectTokens._angularProvider];
  paramTypes: ParamTypes;
  _isCaseInsensitive: boolean;
  _isStrictMode: boolean;
  _defaultSquashPolicy: boolean | string;

  /**
   * @param {ng.AngularServiceProvider} $angularProvider
   */
  constructor($angularProvider: ng.AngularServiceProvider) {
    this.paramTypes = new ParamTypes($angularProvider.$get());
    this._isCaseInsensitive = false;
    this._isStrictMode = true;
    this._defaultSquashPolicy = false;
    /**
     * Applys ng1-specific path parameter encoding
     *
     * The Angular 1 `$location` service is a bit weird.
     * It doesn't allow slashes to be encoded/decoded bi-directionally.
     *
     * See the writeup at https://github.com/angular-ui/ui-router/issues/2598
     *
     * This code patches the `path` parameter type so it encoded/decodes slashes as ~2F
     *
     */
    /** @type {import("../params/param-type.ts").ParamType} */
    const pathType = this.type("path") as ParamType;

    pathType.encode = (x: unknown) =>
      !isNullOrUndefined(x)
        ? x
            .toString()
            .replace(/([~/])/g, (i: string) => (i === "~" ? "~~" : "~2F"))
        : x;

    pathType.decode = (x: unknown) =>
      !isNullOrUndefined(x)
        ? x
            .toString()
            .replace(/(~~|~2F)/g, (i: string) => (i === "~~" ? "~" : "/"))
        : x;
    this.paramTypes.enqueue = false;
    this.paramTypes._flushTypeQueue();
  }

  $get = () => this;

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
  caseInsensitive(value?: boolean): boolean {
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
  defaultSquashPolicy(value?: boolean | string): boolean | string {
    if (
      isDefined(value) &&
      value !== true &&
      value !== false &&
      !isString(value)
    )
      throw new Error(
        `Invalid squash policy: ${value}. Valid policies: false, true, arbitrary-string`,
      );

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
  strictMode(value: boolean): boolean {
    return (this._isStrictMode = isDefined(value) ? value : this._isStrictMode);
  }

  /**
   * Creates and registers a custom [[ParamType]] object
   *
   * A custom parameter type can be used to generate URLs with typed parameters or custom encoding/decoding.
   *
   * #### Note: Register custom types *before using them* in a state definition.
   *
   * #### Example:
   * ```js
   * // Encode object parameter as JSON string
   * urlService.config.type('myjson', {
   *   encode: (obj) => JSON.stringify(obj),
   *   decode: (str) => JSON.parse(str),
   *   is: (val) => typeof(val) === 'object',
   *   pattern: /[^/]+/,
   *   equals: (a, b) => _.isEqual(a, b),
   * });
   * ```
   *
   * See [[ParamTypeDefinition]] for more examples
   *
   * @param {string} name The type name.
   * @param {import("../params/interface.ts").ParamTypeDefinition} [definition] The type definition. See [[ParamTypeDefinition]] for information on the values accepted.
   * @param {() => import("../params/interface.ts").ParamTypeDefinition} [definitionFn] A function that is injected before the app runtime starts.
   *        The result of this function should be a [[ParamTypeDefinition]].
   *        The result is merged into the existing `definition`.
   *        See [[ParamType]] for information on the values accepted.
   *
   * @returns {import("../params/param-type.ts").ParamType | UrlConfigProvider | undefined}
   */
  type(name: string): ParamType | undefined;
  type(
    name: string,
    definition: ParamTypeDefinition,
    definitionFn?: () => ParamTypeDefinition,
  ): UrlConfigProvider;
  type(
    name: string,
    definition?: ParamTypeDefinition,
    definitionFn?: () => ParamTypeDefinition,
  ): ParamType | UrlConfigProvider | undefined {
    if (!isDefined(definition)) {
      return this.paramTypes.type(name);
    }

    this.paramTypes.type(
      name,
      /** @type {import("../params/interface.ts").ParamTypeDefinition} */ definition,
      definitionFn,
    );

    return this;
  }
}
