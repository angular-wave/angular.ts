export const DirectiveSuffix: "Directive";
export class CompileProvider {
  static $inject: string[];
  /**
   * @param {ng.ProvideService} $provide
   * @param {import('../sanitize/sanitize-uri.js').SanitizeUriProvider} $sanitizeUriProvider
   */
  constructor(
    $provide: ng.ProvideService,
    $sanitizeUriProvider: import("../sanitize/sanitize-uri.js").SanitizeUriProvider,
  );
  /**
   * Register a new directive with the compiler.
   *
   * @param {string|Object} name Name of the directive in camel-case (i.e. `ngBind` which will match
   *    as `ng-bind`), or an object map of directives where the keys are the names and the values
   *    are the factories.
   * @param {Function|Array<Function>} directiveFactory An injectable directive factory function. See the
   *    {@link guide/directive directive guide} and the {@link $compile compile API} for more info.
   * @returns {CompileProvider} Self for chaining.
   */
  directive: (
    name: string | any,
    directiveFactory: Function | Array<Function>,
  ) => CompileProvider;
  /**
   * @param {string|Object} name Name of the component in camelCase (i.e. `myComp` which will match `<my-comp>`),
   *    or an object map of components where the keys are the names and the values are the component definition objects.
   * @param {import("../../interface.ts").Component} options Component definition object (a simplified
   *    {directive definition object}),
   *    with the following properties (all optional):
   *
   *    - `controller` – `{(string|function()=}` – controller constructor function that should be
   *      associated with newly created scope or the name of a {controller} if passed as a string. An empty `noop` function by default.
   *    - `controllerAs` – `{string=}` – identifier name for to reference the controller in the component's scope.
   *      If present, the controller will be published to scope under the `controllerAs` name.
   *      If not present, this will default to be `$ctrl`.
   *    - `template` – `{string=|function()=}` – html template as a string or a function that
   *      returns an html template as a string which should be used as the contents of this component.
   *      Empty string by default.
   *
   *      If `template` is a function, then it is {injected} with
   *      the following locals:
   *
   *      - `$element` - Current element
   *      - `$attrs` - Current attributes object for the element
   *
   *    - `templateUrl` – `{string=|function()=}` – path or function that returns a path to an html
   *      template that should be used  as the contents of this component.
   *
   *      If `templateUrl` is a function, then it is {injected} with
   *      the following locals:
   *
   *      - `$element` - Current element
   *      - `$attrs` - Current attributes object for the element
   *
   *    - `bindings` – `{object=}` – defines bindings between DOM attributes and component properties.
   *      Component properties are always bound to the component controller and not to the scope.
   *      See {`bindToController`}.
   *    - `transclude` – `{boolean=}` – whether {content transclusion} is enabled.
   *      Disabled by default.
   *    - `require` - `{Object<string, string>=}` - requires the controllers of other directives and binds them to
   *      this component's controller. The object keys specify the property names under which the required
   *      controllers (object values) will be bound. See {`require`}.
   *    - `$...` – additional properties to attach to the directive factory function and the controller
   *      constructor function. (This is used by the component router to annotate)
   *
   * @returns {CompileProvider} the compile provider itself, for chaining of function calls.
   */
  component: (
    name: string | any,
    options: import("../../interface.ts").Component,
  ) => CompileProvider;
  /**
   * Retrieves or overrides the default regular expression that is used for determining trusted safe
   * urls during a[href] sanitization.
   *
   * The sanitization is a security measure aimed at preventing XSS attacks via html links.
   *
   * Any url about to be assigned to a[href] via data-binding is first normalized and turned into
   * an absolute url. Afterwards, the url is matched against the `aHrefSanitizationTrustedUrlList`
   * regular expression. If a match is found, the original url is written into the dom. Otherwise,
   * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
   *
   * @param {RegExp=} regexp New regexp to trust urls with.
   * @returns {RegExp|import('../sanitize/sanitize-uri.js').SanitizeUriProvider} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  aHrefSanitizationTrustedUrlList: (
    regexp?: RegExp | undefined,
  ) => RegExp | import("../sanitize/sanitize-uri.js").SanitizeUriProvider;
  /**
   * Retrieves or overrides the default regular expression that is used for determining trusted safe
   * urls during img[src] sanitization.
   *
   * The sanitization is a security measure aimed at prevent XSS attacks via html links.
   *
   * Any url about to be assigned to img[src] via data-binding is first normalized and turned into
   * an absolute url. Afterwards, the url is matched against the `imgSrcSanitizationTrustedUrlList`
   * regular expression. If a match is found, the original url is written into the dom. Otherwise,
   * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
   *
   * @param {RegExp=} regexp New regexp to trust urls with.
   * @returns {RegExp|import('../sanitize/sanitize-uri.js').SanitizeUriProvider | undefined} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  imgSrcSanitizationTrustedUrlList: (
    regexp?: RegExp | undefined,
  ) =>
    | RegExp
    | import("../sanitize/sanitize-uri.js").SanitizeUriProvider
    | undefined;
  strictComponentBindingsEnabled: (enabled: boolean) => boolean | this;
  /**
   * Defines the security context for DOM properties bound by ng-prop-*.
   *
   * @param {string} elementName The element name or '*' to match any element.
   * @param {string} propertyName The DOM property name.
   * @param {string} ctx The {@link _sce} security context in which this value is safe for use, e.g. `$sce.URL`
   * @returns {object} `this` for chaining
   */
  addPropertySecurityContext: (
    elementName: string,
    propertyName: string,
    ctx: string,
  ) => object;
  $get: (
    | string
    | ((
        $injector: ng.InjectorService,
        $interpolate: ng.InterpolateService,
        $exceptionHandler: ng.ExceptionHandlerService,
        $templateRequest: ng.TemplateRequestService,
        $parse: ng.ParseService,
        $controller: ng.ControllerService,
        $sce: ng.SceService,
        $animate: ng.AnimateService,
      ) => (
        compileNode: string | Element | Node | ChildNode | NodeList | null,
        transcludeFn?: import("./interface.ts").TranscludeFn | null,
        maxPriority?: number,
        ignoreDirective?: string,
        previousCompileContext?: any,
      ) => import("./interface.ts").PublicLinkFn)
  )[];
}
export type BoundTranscludeFn = import("./interface.ts").BoundTranscludeFn;
export type ChildTranscludeOrLinkFn =
  import("./interface.ts").ChildTranscludeOrLinkFn;
export type CloneAttachFn = import("./interface.ts").CloneAttachFn;
export type CompileNodesFn = import("./interface.ts").CompileNodesFn;
export type CompositeLinkFn = import("./interface.ts").CompositeLinkFn;
export type NodeLinkFn = import("./interface.ts").NodeLinkFn;
export type NodeLinkFnCtx = import("./interface.ts").NodeLinkFnCtx;
export type PreviousCompileContext =
  import("./interface.ts").PreviousCompileContext;
export type PublicLinkFn = import("./interface.ts").PublicLinkFn;
export type TranscludedNodes = import("./interface.ts").TranscludedNodes;
