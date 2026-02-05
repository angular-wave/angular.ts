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
  static $inject: string[];
  /**
   * @param {ng.AngularServiceProvider} $angularProvider
   */
  constructor($angularProvider: ng.AngularServiceProvider);
  /** @type {ParamTypes} */
  paramTypes: ParamTypes;
  /** @type {boolean} */
  _isCaseInsensitive: boolean;
  /** @type {boolean} */
  _isStrictMode: boolean;
  /** @type {boolean | string} */
  _defaultSquashPolicy: boolean | string;
  $get: () => this;
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
  caseInsensitive(value?: boolean): boolean;
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
  defaultSquashPolicy(value?: boolean | string): boolean | string;
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
  strictMode(value: boolean): boolean;
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
   * @returns if only the `name` parameter was specified: the currently registered [[ParamType]] object, or undefined
   */
  type(
    name: string,
    definition?: import("../params/interface.ts").ParamTypeDefinition,
    definitionFn?: () => import("../params/interface.ts").ParamTypeDefinition,
  ): any;
}
