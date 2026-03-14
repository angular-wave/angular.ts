import {
  createElementFromHTML,
  createNodelistFromHTML,
  emptyElement,
  getBooleanAttrName,
  getCacheData,
  getInheritedData,
  isTextNode,
  setCacheData,
  setIsolateScope,
  setScope,
  startingTag,
} from "../../shared/dom.js";
import { NodeType } from "../../shared/node.ts";
import { NodeRef } from "../../shared/noderef.js";
import { identifierForController } from "../controller/controller.ts";
import {
  assertArg,
  assertNotHasOwnProperty,
  bind,
  deProxy,
  directiveNormalize,
  entries,
  equals,
  extend,
  getNodeName,
  hasOwn,
  inherit,
  isArray,
  isBoolean,
  isDefined,
  isError,
  isFunction,
  isObject,
  isScope,
  isString,
  isUndefined,
  minErr,
  nullObject,
  simpleCompare,
  trim,
  values,
} from "../../shared/utils.js";
import { SCE_CONTEXTS } from "../../services/sce/sce.js";
import { PREFIX_REGEXP } from "../../shared/constants.ts";
import {
  createEventDirective,
  createWindowEventDirective,
} from "../../directive/events/events.js";
import { Attributes } from "./attributes.js";
import { ngObserveDirective } from "../../directive/observe/observe.js";
import { $injectTokens, $injectTokens as $t } from "../../injection-tokens.js";

/** @typedef {import("./interface.ts").BoundTranscludeFn} BoundTranscludeFn */
/** @typedef {import("./interface.ts").ChildTranscludeOrLinkFn} ChildTranscludeOrLinkFn */
/** @typedef {import("./interface.ts").ChildLinkFn} ChildLinkFn */
/** @typedef {import("./interface.ts").CloneAttachFn} CloneAttachFn */
/** @typedef {import("./interface.ts").CompileNodesFn} CompileNodesFn */
/** @typedef {import("./interface.ts").CompositeLinkFn} CompositeLinkFn */
/** @typedef {import("./interface.ts").NodeLinkFn} NodeLinkFn */
/** @typedef {import("./interface.ts").NodeLinkFnCtx } NodeLinkFnCtx */
/** @typedef {import("./interface.ts").PreviousCompileContext} PreviousCompileContext */
/** @typedef {import("./interface.ts").PublicLinkFn} PublicLinkFn */
/** @typedef {import("./interface.ts").StoredNodeLinkFn} StoredNodeLinkFn */
/** @typedef {import("./interface.ts").TranscludedNodes} TranscludedNodes */
/** @typedef {import("./interface.ts").InternalDirective} InternalDirective */
/** @typedef {{ _fn: Function; _require: string | Array<any> | Record<string, any> | undefined; _directiveName: string; _isolateScope: boolean; _linkCtx?: any }} LinkFnRecord */
/** @typedef {{ _linkFnsList: import("./interface.ts").LinkFnMapping[]; _nodeRefList: NodeRef; _nodeLinkFnFound?: Function; _transcludeFn: ChildTranscludeOrLinkFn | null | undefined }} CompositeLinkState */
/** @typedef {{ _compileNode: Node | Element; _templateAttrs: Attributes; _transcludeFn: ChildTranscludeOrLinkFn; _controllerDirectives?: Record<string, any>; _newIsolateScopeDirective?: InternalDirective | null; _newScopeDirective?: InternalDirective | null; _hasElementTranscludeDirective?: boolean; _preLinkFns: LinkFnRecord[]; _postLinkFns: LinkFnRecord[] }} NodeLinkState */
/** @typedef {{ _boundTranscludeFn: BoundTranscludeFn; _elementControllers: Record<string, any>; _hasElementTranscludeDirective?: boolean; _scopeToChild: import("../scope/scope.js").Scope; _elementRef: NodeRef }} ControllersBoundTranscludeState */
/** @typedef {{ _interpolateFn: import("../interpolate/interface.ts").InterpolationFunction; _watchExpression: string }} TextInterpolateLinkState */
/** @typedef {{ _name: string; _value: string; _trustedContext: string | undefined; _allOrNothing: boolean; _interpolateFn?: import("../interpolate/interface.ts").InterpolationFunction }} AttrInterpolateLinkState */
/** @typedef {{ _attrName: string; _propName: string; _ngPropGetter: Function; _sanitizer: Function }} PropertyDirectiveLinkState */
/** @typedef {{ _linkQueue: any[] | null; _afterTemplateChildLinkFn: CompositeLinkFn | null; _afterTemplateNodeLinkFnCtx?: NodeLinkFnCtx; _beforeTemplateCompileNode: Node | Element; _compileNodeRef: NodeRef; _compiledNode?: Element; _origAsyncDirective: InternalDirective; _previousCompileContext: PreviousCompileContext; }} DelayedTemplateLinkState */

const $compileMinErr = minErr("$compile");

const EXCLUDED_DIRECTIVES = ["ngIf", "ngRepeat"];

const ALL_OR_NOTHING_ATTRS = ["ngSrc", "ngSrcset", "src", "srcset"];

const REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;

const NG_PREFIX_BINDING = /^ng(Attr|Prop|On|Observe|Window)([A-Z].*)$/;

// Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
// The assumption is that future DOM event attribute names will begin with
// 'on' and be composed of only English letters.
const EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;

const valueFn = (/** @type {any} */ value) => () => value;

export const DirectiveSuffix = "Directive";

export class CompileProvider {
  /* @ignore */ static $inject = [$t._provide, $t._sanitizeUriProvider];

  /**
   * @param {ng.ProvideService} $provide
   * @param {import('../sanitize/sanitize-uri.ts').SanitizeUriProvider} $sanitizeUriProvider
   */
  constructor($provide, $sanitizeUriProvider) {
    /**
     * @type {Record<string, any>}
     */
    const hasDirectives = {};

    const bindingCache = nullObject();

    /** @type {Record<string, any[] | undefined>} */
    const directiveLookupCache = nullObject();

    /**
     * @param {Object} scope
     * @param {string} directiveName
     * @param {boolean} isController
     * @returns {Object} a configuration object for attribute bindings
     */
    function parseIsolateBindings(scope, directiveName, isController) {
      const LOCAL_REGEXP = /^([@&]|[=<]())(\??)\s*([\w$]*)$/;

      const bindings = nullObject();

      entries(scope).forEach(([scopeName, definition]) => {
        definition = definition.trim();

        if (definition in bindingCache) {
          bindings[scopeName] = bindingCache[definition];

          return;
        }
        const match = definition.match(LOCAL_REGEXP);

        if (!match) {
          throw $compileMinErr(
            "iscp",
            "Invalid {3} for directive '{0}'." +
              " Definition: {... {1}: '{2}' ...}",
            directiveName,
            scopeName,
            definition,
            isController
              ? "controller bindings definition"
              : "isolate scope definition",
          );
        }

        bindings[scopeName] = {
          mode: match[1][0],
          collection: match[2] === "*",
          optional: match[3] === "?",
          attrName: match[4] || scopeName,
        };

        if (match[4]) {
          bindingCache[definition] = bindings[scopeName];
        }
      });

      return bindings;
    }

    /**
     * @param {ng.Directive} directive
     * @param {string} directiveName
     */
    function parseDirectiveBindings(directive, directiveName) {
      /** @type {{ isolateScope: Object|null, bindToController: Object|null }} */
      const bindings = {
        isolateScope: null,
        bindToController: null,
      };

      if (isObject(directive.scope)) {
        if (directive.bindToController === true) {
          bindings.bindToController = parseIsolateBindings(
            directive.scope,
            directiveName,
            true,
          );
          bindings.isolateScope = {};
        } else {
          bindings.isolateScope = parseIsolateBindings(
            directive.scope,
            directiveName,
            false,
          );
        }
      }

      if (isObject(directive.bindToController)) {
        bindings.bindToController = parseIsolateBindings(
          directive.bindToController,
          directiveName,
          true,
        );
      }

      if (bindings.bindToController && !directive.controller) {
        // There is no controller
        throw $compileMinErr(
          "noctrl",
          "Cannot bind to controller without directive '{0}'s controller.",
          directiveName,
        );
      }

      return bindings;
    }

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
    this.directive = function registerDirective(name, directiveFactory) {
      assertArg(name, "name");

      if (isString(name)) {
        assertNotHasOwnProperty(name, "directive");
        assertValidDirectiveName(name);
        assertArg(directiveFactory, "directiveFactory");

        if (!hasOwn(hasDirectives, name)) {
          hasDirectives[name] = [];
          $provide.factory(name + DirectiveSuffix, [
            $injectTokens._injector,
            $injectTokens._exceptionHandler,
            /**
             * @param {ng.InjectorService} $injector
             * @param {ng.ExceptionHandlerService} $exceptionHandler
             */
            function ($injector, $exceptionHandler) {
              const directives = [];

              for (let i = 0, l = hasDirectives[name].length; i < l; i++) {
                const directiveFactoryInstance = hasDirectives[name][i];

                try {
                  let directive = $injector.invoke(directiveFactoryInstance);

                  if (isFunction(directive)) {
                    directive = { compile: valueFn(directive) };
                  } else if (!directive.compile && directive.link) {
                    directive.compile = valueFn(directive.link);
                  }

                  directive.priority = directive.priority || 0;
                  directive.index = i;
                  directive.name = directive.name || name;
                  directive.require = getDirectiveRequire(directive);
                  directive.restrict = getDirectiveRestrict(
                    directive.restrict,
                    name,
                  );

                  directives.push(directive);
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              return directives;
            },
          ]);
        }
        hasDirectives[name].push(directiveFactory);
        delete directiveLookupCache[name];
      } else {
        entries(name).forEach(([k, v]) => registerDirective(k, v));
      }

      return this;
    };

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
    this.component = function (name, options) {
      if (!isString(name)) {
        entries(name).forEach(([key, val]) => this.component(key, val));

        return this;
      }

      const controller =
        options.controller ||
        function () {
          /* empty */
        };

      /**
       * @param {ng.InjectorService} $injector
       */
      function factory($injector) {
        /**
         * @param {string | Function | ng.AnnotatedFactory<any> | undefined} fn
         */
        const makeInjectable = (fn) => {
          if (isFunction(fn) || isArray(fn)) {
            return (
              /** @type {HTMLElement} */ tElement,
              /** @type {ng.Attributes} */ tAttrs,
            ) => {
              return $injector.invoke(fn, null, {
                $element: tElement,
                $attrs: tAttrs,
              });
            };
          }

          return fn;
        };

        const template =
          !options.template && !options.templateUrl ? "" : options.template;

        /** @type {Record<string, any>} */
        const ddo = {
          controller,
          controllerAs:
            identifierForController(options.controller) ||
            options.controllerAs ||
            "$ctrl",
          template: makeInjectable(template),
          templateUrl: makeInjectable(options.templateUrl),
          transclude: options.transclude,
          scope: {},
          bindToController: options.bindings || {},
          restrict: "E",
          require: options.require,
        };

        // Copy annotations (starting with $) over to the DDO
        entries(options).forEach(([key, val]) => {
          if (key.charAt(0) === "$") {
            ddo[key] = val;
          }
        });

        return ddo;
      }

      // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
      // These could be used by libraries such as the new component router
      entries(options).forEach(([key, val]) => {
        if (key.charAt(0) === "$") {
          /** @type {Record<string, any>} */ (factory)[key] = val;

          // Don't try to copy over annotations to named controller
          if (isFunction(controller)) {
            /** @type {Record<string, any>} */ (controller)[key] = val;
          }
        }
      });

      factory.$inject = [$injectTokens._injector];

      return this.directive(name, factory);
    };

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
     * @returns {RegExp|import('../sanitize/sanitize-uri.ts').SanitizeUriProvider} Current RegExp if called without value or self for
     *    chaining otherwise.
     */
    this.aHrefSanitizationTrustedUrlList = function (regexp) {
      if (isDefined(regexp)) {
        $sanitizeUriProvider.aHrefSanitizationTrustedUrlList(regexp);
      }

      return $sanitizeUriProvider.aHrefSanitizationTrustedUrlList();
    };

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
     * @returns {RegExp|import('../sanitize/sanitize-uri.ts').SanitizeUriProvider | undefined} Current RegExp if called without value or self for
     *    chaining otherwise.
     */
    this.imgSrcSanitizationTrustedUrlList = function (regexp) {
      if (isDefined(regexp)) {
        $sanitizeUriProvider.imgSrcSanitizationTrustedUrlList(regexp);

        return undefined;
      }

      return $sanitizeUriProvider.imgSrcSanitizationTrustedUrlList();
    };

    /**
     * @param {boolean=} enabled update the strictComponentBindingsEnabled state if provided,
     * otherwise return the current strictComponentBindingsEnabled state.
     * @returns {*} current value if used as getter or itself (chaining) if used as setter
     *
     * Call this method to enable / disable the strict component bindings check. If enabled, the
     * compiler will enforce that all scope / controller bindings of a
     * {@link $compileProvider#directive} / {@link $compileProvider#component}
     * that are not set as optional with `?`, must be provided when the directive is instantiated.
     * If not provided, the compiler will throw the
     * {@link error/$compile/missingattr $compile:missingattr error}.
     *
     * The default value is false.
     */
    let strictComponentBindingsEnabled = false;

    this.strictComponentBindingsEnabled =
      /** @param {boolean} enabled */ function (enabled) {
        if (isDefined(enabled)) {
          strictComponentBindingsEnabled = enabled;

          return this;
        }

        return strictComponentBindingsEnabled;
      };

    /**
     * The security context of DOM Properties.
     */
    const PROP_CONTEXTS = nullObject();

    /**
     * Defines the security context for DOM properties bound by ng-prop-*.
     *
     * @param {string} elementName The element name or '*' to match any element.
     * @param {string} propertyName The DOM property name.
     * @param {string} ctx The {@link _sce} security context in which this value is safe for use, e.g. `$sce.URL`
     * @returns {object} `this` for chaining
     */
    this.addPropertySecurityContext = function (
      elementName,
      propertyName,
      ctx,
    ) {
      const key = `${elementName.toLowerCase()}|${propertyName.toLowerCase()}`;

      if (key in PROP_CONTEXTS && PROP_CONTEXTS[key] !== ctx) {
        throw $compileMinErr(
          "ctxoverride",
          "Property context '{0}.{1}' already set to '{2}', cannot override to '{3}'.",
          elementName,
          propertyName,
          PROP_CONTEXTS[key],
          ctx,
        );
      }

      PROP_CONTEXTS[key] = ctx;

      return this;
    };

    /* Default property contexts.
     *
     * Copy of https://github.com/angular/angular/blob/6.0.6/packages/compiler/src/schema/dom_security_schema.ts#L31-L58
     * Changing:
     * - SecurityContext.* => SCE_CONTEXTS/$sce.*
     * - STYLE => CSS
     * - various URL => MEDIA_URL
     * - *|formAction, form|action URL => RESOURCE_URL (like the attribute)
     */
    (function registerNativePropertyContexts() {
      /**
       * @param {string} ctx
       * @param {any[]} items
       */
      function registerContext(ctx, items) {
        items.forEach((v) => {
          PROP_CONTEXTS[v.toLowerCase()] = ctx;
        });
      }

      registerContext(SCE_CONTEXTS.HTML, [
        "iframe|srcdoc",
        "*|innerHTML",
        "*|outerHTML",
      ]);
      registerContext(SCE_CONTEXTS.CSS, ["*|style"]);
      registerContext(SCE_CONTEXTS.URL, [
        "area|href",
        "area|ping",
        "a|href",
        "a|ping",
        "blockquote|cite",
        "body|background",
        "del|cite",
        "input|src",
        "ins|cite",
        "q|cite",
      ]);
      registerContext(SCE_CONTEXTS.MEDIA_URL, [
        "audio|src",
        "img|src",
        "img|srcset",
        "source|src",
        "source|srcset",
        "track|src",
        "video|src",
        "video|poster",
      ]);
      registerContext(SCE_CONTEXTS.RESOURCE_URL, [
        "*|formAction",
        "applet|code",
        "applet|codebase",
        "base|href",
        "embed|src",
        "frame|src",
        "form|action",
        "head|profile",
        "html|manifest",
        "iframe|src",
        "link|href",
        "media|src",
        "object|codebase",
        "object|data",
        "script|src",
      ]);
    })();

    this.$get = [
      $t._injector,
      $t._interpolate,
      $t._exceptionHandler,
      $t._templateRequest,
      $t._parse,
      $t._controller,
      $t._sce,
      $t._animate,
      /**
       * @param {ng.InjectorService} $injector
       * @param {ng.InterpolateService} $interpolate
       * @param {ng.ExceptionHandlerService} $exceptionHandler
       * @param {ng.TemplateRequestService} $templateRequest
       * @param {ng.ParseService} $parse
       * @param {ng.ControllerService} $controller
       * @param {ng.SceService} $sce
       * @param {ng.AnimateService} $animate
       * @returns {ng.CompileService}
       */
      (
        $injector,
        $interpolate,
        $exceptionHandler,
        $templateRequest,
        $parse,
        $controller,
        $sce,
        $animate,
      ) => {
        // The onChanges hooks should all be run together in a single digest
        // When changes occur, the call to trigger their hooks will be added to this queue
        /**
         * @type {(() => void)[]}
         */
        const onChangesQueue = [];

        // This function is called in a $postUpdate to trigger all the onChanges hooks in a single digest
        function flushOnChangesQueue() {
          for (let i = 0, ii = onChangesQueue.length; i < ii; ++i) {
            try {
              onChangesQueue[i]();
            } catch (err) {
              $exceptionHandler(err);
            }
          }
          // Reset the queue to trigger a new schedule next time there is a change
          onChangesQueue.length = 0;
        }

        const startSymbol = $interpolate.startSymbol();

        const endSymbol = $interpolate.endSymbol();

        /** @type {(x: string) => string} */
        const denormalizeTemplate =
          startSymbol === "{{" && endSymbol === "}}"
            ? (x) => x
            : (x) => x.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);

        return compile;

        /**
         * @type {ng.CompileService}
         */
        function compile(
          element,
          transcludeFn,
          maxPriority,
          ignoreDirective,
          previousCompileContext,
        ) {
          /** @type {NodeRef | null} */
          let nodeRef = element ? new NodeRef(element) : null;

          /**
           * The composite link function is a composite of individual node linking functions.
           * It will be invoke by the public link function below.
           * @type {ng.CompositeLinkFn | null}
           */
          let compositeLinkFn = compileNodes(
            nodeRef,
            /** @type {ChildTranscludeOrLinkFn} */ (transcludeFn),
            maxPriority,
            ignoreDirective,
            previousCompileContext,
          );

          /**
           * @type {string | null}
           */
          let namespace = null;

          /** @type {ng.PublicLinkFn} */
          const publicLinkFn = function (scope, cloneConnectFn, options) {
            if (!nodeRef) {
              throw $compileMinErr(
                "multilink",
                "This element has already been linked.",
              );
            }

            assertArg(scope, "scope");

            // could be empty nodelist
            if (nodeRef._element) {
              setScope(nodeRef._element, scope);
            }

            if (
              previousCompileContext &&
              previousCompileContext._needsNewScope
            ) {
              // A parent directive did a replace and a directive on this element asked
              // for transclusion, which caused us to lose a layer of element on which
              // we could hold the new transclusion scope, so we will create it manually
              // here.
              scope = scope.$parent?.$new() || scope.$new();
            }

            options = options || {};
            let { _parentBoundTranscludeFn } = options;

            const { _transcludeControllers, _futureParentElement } = options;

            // When `_parentBoundTranscludeFn` is passed, it is a
            // `controllersBoundTransclude` function (it was previously passed
            // as `transclude` to directive.link) so we must unwrap it to get
            // its `boundTranscludeFn`
            if (
              _parentBoundTranscludeFn &&
              _parentBoundTranscludeFn._boundTransclude
            ) {
              _parentBoundTranscludeFn =
                _parentBoundTranscludeFn._boundTransclude;
            }

            if (!namespace) {
              namespace = detectNamespaceForChildElements(_futureParentElement);
            }
            /** @type {NodeRef} */
            let $linkNode;

            if (namespace !== "html") {
              // When using a directive with replace:true and templateUrl the jqCompileNodes
              // (or a child element inside of them)
              // might change, so we need to recreate the namespace adapted compileNodes
              // for call to the link function.
              // Note: This will already clone the nodes...
              const fragment = createElementFromHTML("<div></div>");

              fragment.append(nodeRef.node);
              const wrappedTemplate = wrapTemplate(
                namespace,
                fragment.innerHTML,
              );

              $linkNode = new NodeRef(wrappedTemplate[0]);
            } else if (cloneConnectFn) {
              $linkNode = nodeRef._clone();
            } else {
              $linkNode = nodeRef;
            }

            if (_transcludeControllers) {
              const controllers =
                /** @type {Record<string, { instance: any }>} */ (
                  _transcludeControllers
                );

              for (const controllerName in controllers) {
                assertArg($linkNode.element, "element");
                setCacheData(
                  $linkNode.element,
                  `$${controllerName}Controller`,
                  controllers[controllerName].instance,
                );
              }
            }

            if (cloneConnectFn) {
              cloneConnectFn($linkNode.dom, scope);
            }

            if (compositeLinkFn) {
              compositeLinkFn(scope, $linkNode, _parentBoundTranscludeFn);
            }

            if (!cloneConnectFn) {
              nodeRef = compositeLinkFn = null;
            }

            return $linkNode._getAll();
          };

          return publicLinkFn;
        }

        /**
         * Runs node-level and child-level link functions for one compiled node list using precomputed mapping state.
         *
         * @param {CompositeLinkState} state
         * @param {Node[]} stableNodeList
         * @param {ng.Scope} scope
         * @param {*} _parentBoundTranscludeFn
         */
        function linkCompositeNodes(
          state,
          stableNodeList,
          scope,
          _parentBoundTranscludeFn,
        ) {
          for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
            const { _index, _nodeLinkFnCtx, _childLinkFn } =
              state._linkFnsList[i];

            const node = stableNodeList[_index];

            /** @type {any} */ (node)._stable = true;

            let childScope, childBoundTranscludeFn;

            if (_nodeLinkFnCtx?._nodeLinkFn) {
              childScope = _nodeLinkFnCtx._newScope ? scope.$new() : scope;

              if (_nodeLinkFnCtx._transcludeOnThisElement) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  /** @type {ng.TranscludeFn} */ (_nodeLinkFnCtx._transclude),
                  _parentBoundTranscludeFn,
                );
              } else if (
                !_nodeLinkFnCtx._templateOnThisElement &&
                _parentBoundTranscludeFn
              ) {
                childBoundTranscludeFn = _parentBoundTranscludeFn;
              } else if (!_parentBoundTranscludeFn && state._transcludeFn) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  /** @type {ng.TranscludeFn} */ (state._transcludeFn),
                );
              } else {
                childBoundTranscludeFn = null;
              }

              if (_nodeLinkFnCtx?._newScope) {
                setScope(node, childScope);
              }

              invokeNodeLinkFnCtx(
                _nodeLinkFnCtx,
                _childLinkFn,
                childScope,
                node,
                childBoundTranscludeFn,
              );
            } else if (_childLinkFn) {
              _childLinkFn(
                scope,
                new NodeRef(node.childNodes),
                _parentBoundTranscludeFn,
              );
            }
          }
        }

        /**
         * Compiles a `NodeRef` (single node or node-list) into a composite linking function.
         *
         * Walks each node in `nodeRefList`, collects and applies directives (including template/templateUrl
         * and transclusion handling), then recursively compiles child nodes when appropriate. The result is
         * a `CompositeLinkFn` that, when invoked, links all compiled nodes in a stable order and wires up
         * any required bound transclusion functions.
         *
         * Notes:
         * - If no directives (or child link fns) are found anywhere in the list, this returns `null`.
         * - `previousCompileContext` is only applied to the first node in a “virtual group” and is cleared
         *   for subsequent nodes.
         *
         * @param {NodeRef | null} nodeRefList
         *   The compilation root: either a single node wrapper or a wrapper around a NodeList/array.
         * @param {ChildTranscludeOrLinkFn | null | undefined} transcludeFn
         *   Parent transclusion/link function propagated down during compilation. When compiling child nodes,
         *   this may be replaced with a node-specific transclusion function (e.g. for element transclusion or
         *   template compilation).
         * @param {number | undefined} [maxPriority]
         *   If provided, directives with priority >= `maxPriority` are ignored on the first node in the list.
         *   (Used to stop further directive application when compiling a subset.)
         * @param {string | undefined} [ignoreDirective]
         *   Normalized directive name to ignore while collecting directives (used to prevent recursion when
         *   compiling transcluded content).
         * @param {PreviousCompileContext | null | undefined} [previousCompileContext]
         *   Internal bookkeeping passed through compilation passes to coordinate replace/transclusion/templateUrl
         *   and virtual-group indexing.
         *
         * @returns {CompositeLinkFn | null}
         *   A composite linking function for the compiled node list, or `null` if nothing requires linking.
         */
        function compileNodes(
          nodeRefList,
          transcludeFn,
          maxPriority,
          ignoreDirective,
          previousCompileContext,
        ) {
          if (!nodeRefList) return null;
          /**
           * Aggregates for the composite linking function, where a node in a node list is mapped
           * to a corresponding link function. For single elements, the node should be mapped to
           * a single node link function.
           * @type {ng.LinkFnMapping[]}
           */
          const linkFnsList = []; // An array to hold node indices and their linkFns

          /** @type {Function | undefined} */
          let nodeLinkFnFound;

          let linkFnFound = false;

          for (let i = 0; i < nodeRefList.size; i++) {
            const attrs = new Attributes($animate, $exceptionHandler, $sce);

            const directives = collectDirectives(
              /** @type Element */ (nodeRefList._getIndex(i)),
              attrs,
              i === 0 ? maxPriority : undefined,
              ignoreDirective,
            );

            /** @type {ng.NodeLinkFnCtx | undefined} */
            let nodeLinkFnCtx;

            if (directives.length) {
              nodeLinkFnCtx = applyDirectivesToNode(
                directives,
                nodeRefList?._getIndex(i),
                attrs,
                /** @type {ChildTranscludeOrLinkFn} */ (transcludeFn),
                null,
                [],
                [],
                Object.assign({}, previousCompileContext, {
                  _index: i,
                  _parentNodeRef: nodeRefList,
                  _ctxNodeRef: nodeRefList,
                }),
              );
            }

            let childLinkFn;

            const nodeLinkFn = nodeLinkFnCtx?._nodeLinkFn;

            const { childNodes } = nodeRefList._getIndex(i);

            if (
              (nodeLinkFn && nodeLinkFnCtx?._terminal) ||
              !childNodes ||
              !childNodes.length
            ) {
              childLinkFn = null;
            } else {
              const transcluded = nodeLinkFn
                ? nodeLinkFnCtx?._transcludeOnThisElement ||
                  !nodeLinkFnCtx?._templateOnThisElement
                  ? nodeLinkFnCtx?._transclude
                  : undefined
                : transcludeFn;

              // recursive call
              const childNodeRef = new NodeRef(childNodes);

              childLinkFn = compileNodes(childNodeRef, transcluded);
            }

            if (nodeLinkFn || childLinkFn) {
              linkFnsList.push({
                _index: i,
                _nodeLinkFnCtx: nodeLinkFnCtx,
                _childLinkFn: childLinkFn,
              });
              linkFnFound = true;
              nodeLinkFnFound = nodeLinkFnFound || nodeLinkFn;
            }

            // use the previous context only for the first element in the virtual group
            previousCompileContext = null;
          }

          if (!linkFnFound) {
            return null;
          }

          /** @type {CompositeLinkState} */
          const compositeLinkState = {
            _linkFnsList: linkFnsList,
            _nodeRefList: nodeRefList,
            _nodeLinkFnFound: nodeLinkFnFound,
            _transcludeFn: transcludeFn,
          };

          return function compositeLinkFn(
            scope,
            nodeRef,
            _parentBoundTranscludeFn,
          ) {
            assertArg(nodeRef, "nodeRef");

            const stableNodeList = buildStableNodeList(
              compositeLinkState,
              nodeRef,
            );

            linkCompositeNodes(
              compositeLinkState,
              stableNodeList,
              scope,
              _parentBoundTranscludeFn,
            );
          };
        }

        /**
         * Prebinds a transclusion function to a parent scope and threads parent-bound transclusion context.
         *
         * @param {ng.Scope} scope
         *   The parent scope used to derive transcluded scopes when one is not explicitly provided.
         * @param {ng.TranscludeFn} transcludeFn
         *   The underlying transclusion function to wrap (must expose `_slots` if slot transclusion is used).
         * @param {BoundTranscludeFn | null | undefined} [previousBoundTranscludeFn]
         *   Parent bound transclusion function (used to support nested transclusion).
         * @returns {BoundTranscludeFn}
         */
        function createBoundTranscludeFn(
          scope,
          transcludeFn,
          previousBoundTranscludeFn,
        ) {
          /**
           * Scope-bound wrapper that ensures a transcluded scope exists and forwards to `transcludeFn`.
           *
           * @param {ng.Scope | null | undefined} transcludedScope
           *   The scope to use for transcluded content; if omitted/falsey, a new one is created via
           *   `scope.$transcluded(containingScope)`.
           * @param {CloneAttachFn | undefined} cloneFn
           *   Optional clone-attach callback for the transcluded DOM.
           * @param {unknown} controllers
           *   Controllers to expose to the transclusion (used for element transclusion cases).
           * @param {Node | Element | null | undefined} _futureParentElement
           *   The element that will ultimately contain the transcluded nodes.
           * @param {ng.Scope | undefined} containingScope
           *   The “anchor” scope at the transclusion point, used to derive the transcluded scope.
           * @returns {TranscludedNodes | void}
           */
          function boundTranscludeFn(
            transcludedScope,
            cloneFn,
            controllers,
            _futureParentElement,
            containingScope,
          ) {
            if (!transcludedScope) {
              transcludedScope = scope.$transcluded(
                /** @type {ng.Scope} */ (containingScope),
              );
            }

            const transcludeRes = transcludeFn(transcludedScope, cloneFn, {
              _parentBoundTranscludeFn: previousBoundTranscludeFn,
              _transcludeControllers: controllers,
              _futureParentElement,
            });

            return transcludeRes;
          }

          // We need  to attach the transclusion slots onto the `boundTranscludeFn`
          // so that they are available inside the `controllersBoundTransclude` function
          const boundSlots = (boundTranscludeFn._slots = nullObject());

          for (const slotName in transcludeFn._slots) {
            if (transcludeFn._slots[slotName]) {
              boundSlots[slotName] = createBoundTranscludeFn(
                scope,
                transcludeFn._slots[slotName],
                previousBoundTranscludeFn,
              );
            } else {
              boundSlots[slotName] = null;
            }
          }

          return boundTranscludeFn;
        }

        /**
         * Looks for directives on the given node and adds them to the directive collection which is
         * sorted.
         *
         * @param {Element} node Node to search.
         * @param {Attributes|any} attrs The shared attrs object which is used to populate the normalized attributes.
         * @param {number=} maxPriority Max directive priority.
         * @param {string} [ignoreDirective]
         * @return {InternalDirective[]} An array to which the directives are added to. This array is sorted before the function returns.
         */
        function collectDirectives(node, attrs, maxPriority, ignoreDirective) {
          /**
           * @type {InternalDirective[]}
           */
          const directives = [];

          const { nodeType } = node;

          const attrsMap = attrs.$attr;

          let nodeName;

          switch (nodeType) {
            case NodeType._ELEMENT_NODE /* Element */: {
              nodeName = node.nodeName.toLowerCase();

              if (ignoreDirective !== directiveNormalize(nodeName)) {
                // use the node name: <directive>
                addDirective(
                  directives,
                  directiveNormalize(nodeName),
                  "E",
                  maxPriority,
                );
              }

              // iterate over the attributes
              const nodeAttributes = node.attributes;

              for (
                let j = 0, nodeAttributesLength = nodeAttributes?.length || 0;
                j < nodeAttributesLength;
                j++
              ) {
                let isNgAttr = false;

                let isNgProp = false;

                let isNgEvent = false;

                let isNgObserve = false;

                let isWindow = false;

                const attr = nodeAttributes[j];

                let { name } = attr;

                const { value } = attr;

                let nName = directiveNormalize(name.toLowerCase());

                // Support ng-attr-*, ng-prop-* and ng-on-*
                const ngPrefixMatch = nName.match(NG_PREFIX_BINDING);

                if (ngPrefixMatch) {
                  isNgAttr = ngPrefixMatch[1] === "Attr";
                  isNgProp = ngPrefixMatch[1] === "Prop";
                  isNgEvent = ngPrefixMatch[1] === "On";
                  isNgObserve = ngPrefixMatch[1] === "Observe";
                  isWindow = ngPrefixMatch[1] === "Window";

                  // Normalize the non-prefixed name
                  name = name
                    .replace(PREFIX_REGEXP, "")
                    .toLowerCase()
                    .substring(4 + ngPrefixMatch[1].length)
                    .replace(/_(.)/g, (match, letter) => letter.toUpperCase());
                }

                if (isNgProp || isNgEvent || isWindow) {
                  attrs[nName] = value;
                  attrsMap[nName] = attr.name;

                  if (isNgProp) {
                    addPropertyDirective(node, directives, nName, name);
                  } else if (isNgEvent) {
                    directives.push(
                      /** @type {InternalDirective} */ (
                        createEventDirective(
                          $parse,
                          $exceptionHandler,
                          nName,
                          name,
                        )
                      ),
                    );
                  } else {
                    // isWindow
                    directives.push(
                      /** @type {InternalDirective} */ (
                        createWindowEventDirective(
                          $parse,
                          $exceptionHandler,
                          window,
                          nName,
                          name,
                        )
                      ),
                    );
                  }
                } else if (isNgObserve) {
                  directives.push(
                    /** @type {InternalDirective} */ (
                      ngObserveDirective(name, value)
                    ),
                  );
                } else {
                  // Update nName for cases where a prefix was removed
                  // NOTE: the .toLowerCase() is unnecessary and causes https://github.com/angular/angular.js/issues/16624 for ng-attr-*
                  nName = directiveNormalize(name.toLowerCase());
                  attrsMap[nName] = name;

                  if (isNgAttr || !hasOwn(attrs, nName)) {
                    attrs[nName] = value;

                    if (getBooleanAttrName(node, nName)) {
                      attrs[nName] = true; // presence means true
                    }
                  }

                  addAttrInterpolateDirective(
                    node,
                    directives,
                    value,
                    nName,
                    isNgAttr,
                  );

                  if (nName !== ignoreDirective) {
                    addDirective(directives, nName, "A", maxPriority);
                  }
                }
              }

              if (
                nodeName === "input" &&
                node.getAttribute("type") === "hidden"
              ) {
                // Hidden input elements can have strange behaviour when navigating back to the page
                // This tells the browser not to try to cache and reinstate previous values
                node.setAttribute("autocomplete", "off");
              }

              break;
            }
            case NodeType._TEXT_NODE:
              addTextInterpolateDirective(
                directives,
                /** @type {string} */ (node.nodeValue),
              );
              break;
            default:
              break;
          }

          if (directives.length > 1) {
            directives.sort(byPriority);
          }

          return directives;
        }

        /**
         * A function generator that is used to support both eager and lazy compilation
         * linking function.
         * @param {boolean} eager
         * @param {NodeList | Node | null} nodes
         * @param {ChildTranscludeOrLinkFn | null | undefined} transcludeFn
         * @param {number | undefined} maxPriority
         * @param {string | undefined} ignoreDirective
         * @param {{ _nonTlbTranscludeDirective?: any; _needsNewScope?: any; } | null | undefined} previousCompileContext
         * @returns {ng.PublicLinkFn | ng.TranscludeFn}
         */
        function compilationGenerator(
          eager,
          nodes,
          transcludeFn,
          maxPriority,
          ignoreDirective,
          previousCompileContext,
        ) {
          /** @type { ng.PublicLinkFn | undefined } */
          let compiled;

          if (eager) {
            return /** @type {ng.PublicLinkFn} */ (
              compile(
                nodes,
                transcludeFn,
                maxPriority,
                ignoreDirective,
                previousCompileContext,
              )
            );
          }

          /**
           * @param {Parameters<PublicLinkFn>} args
           * @returns {ReturnType<PublicLinkFn>}
           */
          function lazyCompilation(...args) {
            if (!compiled) {
              compiled = compile(
                nodes,
                transcludeFn,
                maxPriority,
                ignoreDirective,
                previousCompileContext,
              );

              nodes = transcludeFn = previousCompileContext = null;
            }

            return compiled(...args);
          }

          return /** @type {ng.PublicLinkFn} */ (lazyCompilation);
        }

        /**
         * Stores link metadata in a compact record so linking can use shared invokers instead of wrapped closures.
         *
         * @param {LinkFnRecord[]} linkFns
         * @param {Function | null | undefined} linkFn
         * @param {string | Array<any> | Record<string, any> | undefined} require
         * @param {string} directiveName
         * @param {boolean} isolateScope
         * @param {any} [linkCtx]
         */
        function pushLinkFnRecord(
          linkFns,
          linkFn,
          require,
          directiveName,
          isolateScope,
          linkCtx,
        ) {
          if (!linkFn) {
            return;
          }

          linkFns.push({
            _fn: linkFn,
            _require: require,
            _directiveName: directiveName,
            _isolateScope: isolateScope,
            _linkCtx: linkCtx,
          });
        }

        /**
         * Invokes a link record with consistent scope selection and argument ordering.
         *
         * @param {LinkFnRecord} linkFnRecord
         * @param {import("../scope/scope.js").Scope | undefined} isolateScope
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node} node
         * @param {Attributes} attrs
         * @param {*} controllers
         * @param {*} transcludeFn
         */
        function invokeLinkFnRecord(
          linkFnRecord,
          isolateScope,
          scope,
          node,
          attrs,
          controllers,
          transcludeFn,
        ) {
          if (isDefined(linkFnRecord._linkCtx)) {
            return linkFnRecord._fn(
              linkFnRecord._linkCtx,
              linkFnRecord._isolateScope ? isolateScope : scope,
              node,
              attrs,
              controllers,
              transcludeFn,
            );
          }

          return linkFnRecord._fn(
            linkFnRecord._isolateScope ? isolateScope : scope,
            node,
            attrs,
            controllers,
            transcludeFn,
          );
        }

        /**
         * Shared post-link executor for text interpolation directives.
         *
         * @param {TextInterpolateLinkState} linkState
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node} node
         */
        function textInterpolateLinkFn(linkState, scope, node) {
          scope.$watch(linkState._watchExpression, () => {
            applyTextInterpolationValue(
              node,
              linkState._interpolateFn(deProxy(scope)),
            );
          });
        }

        /**
         * Applies the latest interpolated attribute value using the same class/srcset special cases
         * as the original inline pre-link closure.
         *
         * @param {AttrInterpolateLinkState} linkState
         * @param {Attributes} attr
         * @param {string} value
         */
        function applyInterpolatedAttrValue(linkState, attr, value) {
          if (linkState._name === "class") {
            attr.$updateClass(
              value,
              /** @type {Element} */ (attr._element()).classList.value,
            );

            return;
          }

          attr.$set(
            linkState._name,
            linkState._name === "srcset"
              ? $sce.getTrustedMediaUrl(value)
              : value,
          );
        }

        /**
         * Shared pre-link executor for interpolated attributes. The mutable link state keeps the
         * current interpolation function in sync if an earlier compile step rewrites the attribute.
         *
         * @param {AttrInterpolateLinkState} linkState
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node} _element
         * @param {Attributes} attr
         */
        function attrInterpolatePreLinkFn(linkState, scope, _element, attr) {
          const _observers =
            attr._observers || (attr._observers = nullObject());

          // Recompute interpolation if another compile step rewrote the attribute value.
          const attrsAny = /** @type {Record<string, any>} */ (attr);

          const newValue = attrsAny[linkState._name];

          if (newValue !== linkState._value) {
            linkState._interpolateFn =
              /** @type {import("../interpolate/interface.ts").InterpolationFunction | undefined} */ (
                newValue &&
                  $interpolate(
                    newValue,
                    true,
                    linkState._trustedContext,
                    linkState._allOrNothing,
                  )
              );
            linkState._value = newValue;
          }

          if (!linkState._interpolateFn) {
            return;
          }

          attrsAny[linkState._name] = linkState._interpolateFn(scope);
          (
            _observers[linkState._name] || (_observers[linkState._name] = [])
          )._inter = true;

          if (linkState._interpolateFn.expressions.length > 0) {
            const targetScope =
              (attr._observers && attr._observers[linkState._name]._scope) ||
              scope;

            const watchExpression = buildInterpolationWatchExpression(
              linkState._interpolateFn.expressions,
            );

            targetScope.$watch(watchExpression, () => {
              applyInterpolatedAttrValue(
                linkState,
                attr,
                /** @type {import("../interpolate/interface.ts").InterpolationFunction} */ (
                  linkState._interpolateFn
                )(scope),
              );
            });
          }

          if (linkState._interpolateFn.expressions.length === 0) {
            applyInterpolatedAttrValue(linkState, attr, newValue);
          }
        }

        /**
         * Applies one property binding update using the parsed getter and sanitizer captured at compile time.
         *
         * @param {PropertyDirectiveLinkState} linkState
         * @param {import("../scope/scope.js").Scope} scope
         * @param {{ [x: string]: any; }} $element
         */
        function applyPropertyDirectiveValue(linkState, scope, $element) {
          const propValue = linkState._ngPropGetter(scope);

          $element[linkState._propName] = linkState._sanitizer(propValue);
        }

        /**
         * Shared pre-link executor for `ng-prop-*` bindings. Watch callbacks still need per-link state,
         * but the compile-time getter/sanitizer wiring is now reused.
         *
         * @param {PropertyDirectiveLinkState} linkState
         * @param {import("../scope/scope.js").Scope} scope
         * @param {{ [x: string]: any; }} $element
         * @param {Attributes} attr
         */
        function propertyDirectivePreLinkFn(linkState, scope, $element, attr) {
          const attrsAny = /** @type {Record<string, any>} */ (attr);

          applyPropertyDirectiveValue(linkState, scope, $element);

          scope.$watch(linkState._propName, () => {
            applyPropertyDirectiveValue(linkState, scope, $element);
          });

          scope.$watch(attrsAny[linkState._attrName], (val) => {
            $sce.valueOf(val);
            applyPropertyDirectiveValue(linkState, scope, $element);
          });
        }

        /**
         * Invokes node link functions that may either be direct link functions or shared executors
         * that read their per-node state from `nodeLinkFnCtx`.
         *
         * @param {NodeLinkFnCtx} nodeLinkFnCtx
         * @param {ChildLinkFn | CompositeLinkFn | null | undefined} childLinkFn
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node | Element} node
         * @param {BoundTranscludeFn | null} boundTranscludeFn
         */
        function invokeNodeLinkFnCtx(
          nodeLinkFnCtx,
          childLinkFn,
          scope,
          node,
          boundTranscludeFn,
        ) {
          if (isDefined(nodeLinkFnCtx._nodeLinkFnState)) {
            return /** @type {StoredNodeLinkFn} */ (nodeLinkFnCtx._nodeLinkFn)(
              nodeLinkFnCtx._nodeLinkFnState,
              childLinkFn,
              scope,
              node,
              boundTranscludeFn,
            );
          }

          return /** @type {NodeLinkFn} */ (nodeLinkFnCtx._nodeLinkFn)(
            childLinkFn,
            scope,
            node,
            boundTranscludeFn,
          );
        }

        /**
         * Links against a resolved async template using the already materialized node.
         * This is the direct path for links that happen after the template has loaded.
         *
         * @param {DelayedTemplateLinkState} delayedState
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node | Element} node
         * @param {BoundTranscludeFn | null | undefined} boundTranscludeFn
         */
        function invokeResolvedTemplateNodeLink(
          delayedState,
          scope,
          node,
          boundTranscludeFn,
        ) {
          const afterTemplateNodeLinkFnCtx =
            delayedState._afterTemplateNodeLinkFnCtx;

          if (!afterTemplateNodeLinkFnCtx) {
            return;
          }

          let childBoundTranscludeFn = boundTranscludeFn;

          if (afterTemplateNodeLinkFnCtx._transcludeOnThisElement) {
            childBoundTranscludeFn = createBoundTranscludeFn(
              scope,
              /** @type {ng.TranscludeFn} */ (
                afterTemplateNodeLinkFnCtx._transclude
              ),
              boundTranscludeFn,
            );
          }

          invokeNodeLinkFnCtx(
            afterTemplateNodeLinkFnCtx,
            delayedState._afterTemplateChildLinkFn,
            scope,
            node,
            /** @type {BoundTranscludeFn | null} */ (
              childBoundTranscludeFn || null
            ),
          );
        }

        /**
         * Replays one queued link request after an async templateUrl has resolved.
         * Queued requests may need clone/class reconciliation because the template DOM did not
         * exist at the time the original link request was recorded.
         *
         * @param {DelayedTemplateLinkState} delayedState
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node | Element} beforeTemplateLinkNode
         * @param {BoundTranscludeFn | null | undefined} boundTranscludeFn
         */
        function replayResolvedTemplateNodeLink(
          delayedState,
          scope,
          beforeTemplateLinkNode,
          boundTranscludeFn,
        ) {
          const afterTemplateNodeLinkFnCtx =
            delayedState._afterTemplateNodeLinkFnCtx;

          if (!afterTemplateNodeLinkFnCtx || !delayedState._compiledNode) {
            return;
          }

          if (scope._destroyed) {
            return;
          }

          let linkNode = delayedState._compileNodeRef._getAny();

          if (
            beforeTemplateLinkNode !== delayedState._beforeTemplateCompileNode
          ) {
            const oldClasses = /** @type {Element} */ (beforeTemplateLinkNode)
              .className;

            if (
              !(
                delayedState._previousCompileContext
                  ._hasElementTranscludeDirective &&
                delayedState._origAsyncDirective.replace
              )
            ) {
              // The linked node was cloned before the template arrived; clone the resolved template too.
              linkNode = delayedState._compiledNode.cloneNode(true);
              beforeTemplateLinkNode.appendChild(linkNode);
            }

            try {
              if (oldClasses !== "") {
                delayedState._compileNodeRef.element.classList.forEach((cls) =>
                  /** @type {Element} */ (beforeTemplateLinkNode).classList.add(
                    cls,
                  ),
                );
              }
            } catch {
              // Ignore read-only SVG className updates.
            }
          }

          invokeResolvedTemplateNodeLink(
            delayedState,
            scope,
            linkNode,
            boundTranscludeFn,
          );
        }

        /**
         * Shared delayed link executor for async `templateUrl` directives. Until the template resolves,
         * it stores link requests in a compact queue; afterwards it links directly against the resolved template.
         *
         * @param {DelayedTemplateLinkState} delayedState
         * @param {any} _ignoreChildLinkFn
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node | Element} node
         * @param {BoundTranscludeFn | null | undefined} boundTranscludeFn
         */
        function invokeDelayedTemplateNodeLinkFn(
          delayedState,
          _ignoreChildLinkFn,
          scope,
          node,
          boundTranscludeFn,
        ) {
          if (scope._destroyed) {
            return;
          }

          if (delayedState._linkQueue) {
            delayedState._linkQueue.push(scope, node, boundTranscludeFn);

            return;
          }

          invokeResolvedTemplateNodeLink(
            delayedState,
            scope,
            node,
            boundTranscludeFn,
          );
        }

        /**
         * Handles `$transclude(...)` calls for the shared node-link executor.
         *
         * @param {ControllersBoundTranscludeState} transcludeState
         * @param {import("../scope/scope.js").Scope | CloneAttachFn | undefined} scopeParam
         * @param {CloneAttachFn | Node | null | undefined} cloneAttachFn
         * @param {Node | null | undefined} _futureParentElement
         * @param {string | number | undefined} slotName
         */
        function invokeControllersBoundTransclude(
          transcludeState,
          scopeParam,
          cloneAttachFn,
          _futureParentElement,
          slotName,
        ) {
          let _transcludeControllers;

          if (!isScope(scopeParam)) {
            slotName = /** @type {string | number | undefined} */ (
              _futureParentElement
            );
            _futureParentElement = /** @type {Node | null | undefined} */ (
              cloneAttachFn
            );
            cloneAttachFn = /** @type {CloneAttachFn | undefined} */ (
              scopeParam
            );
            scopeParam = undefined;
          }

          if (transcludeState._hasElementTranscludeDirective) {
            _transcludeControllers = transcludeState._elementControllers;
          }

          if (!_futureParentElement) {
            _futureParentElement =
              transcludeState._hasElementTranscludeDirective
                ? transcludeState._elementRef.node.parentElement
                : transcludeState._elementRef.node;
          }

          if (slotName) {
            const slotTranscludeFn =
              transcludeState._boundTranscludeFn._slots[slotName];

            if (slotTranscludeFn) {
              return slotTranscludeFn(
                /** @type {ng.Scope | null | undefined} */ (scopeParam),
                /** @type {CloneAttachFn | undefined} */ (cloneAttachFn),
                _transcludeControllers,
                _futureParentElement,
                transcludeState._scopeToChild,
              );
            }

            if (isUndefined(slotTranscludeFn)) {
              throw $compileMinErr(
                "noslot",
                'No parent directive that requires a transclusion with slot name "{0}". ' +
                  "Element: {1}",
                slotName,
                startingTag(transcludeState._elementRef.element),
              );
            }

            return undefined;
          }

          return transcludeState._boundTranscludeFn(
            /** @type {ng.Scope | null | undefined} */ (scopeParam),
            /** @type {CloneAttachFn | undefined} */ (cloneAttachFn),
            _transcludeControllers,
            _futureParentElement,
            transcludeState._scopeToChild,
          );
        }

        /**
         * Reuses one implementation for the standard node-link path by passing all compile-time
         * state explicitly instead of closing over it in a per-node function.
         *
         * @param {NodeLinkState} nodeLinkState
         * @param {ChildLinkFn | CompositeLinkFn | null | undefined} childLinkFn
         * @param {import("../scope/scope.js").Scope} scope
         * @param {Node | Element} linkNode
         * @param {BoundTranscludeFn | null} boundTranscludeFn
         */
        function invokeStoredNodeLinkFn(
          nodeLinkState,
          childLinkFn,
          scope,
          linkNode,
          boundTranscludeFn,
        ) {
          let isolateScope;

          let controllerScope;

          /** @type {{ [s: string]: any; }} */
          let elementControllers = nullObject();

          let scopeToChild = scope;

          /** @type {NodeRef} */
          let $element;

          /** @type {Attributes} */
          let attrs;

          let scopeBindingInfo;

          if (nodeLinkState._compileNode === linkNode) {
            attrs = nodeLinkState._templateAttrs;
            $element = /** @type {NodeRef} */ (
              nodeLinkState._templateAttrs._nodeRef
            );
          } else {
            $element = new NodeRef(linkNode);
            attrs = new Attributes(
              $animate,
              $exceptionHandler,
              $sce,
              $element,
              nodeLinkState._templateAttrs,
            );
          }

          controllerScope = scope;

          if (nodeLinkState._newIsolateScopeDirective) {
            isolateScope = scope.$newIsolate();
          } else if (nodeLinkState._newScopeDirective) {
            controllerScope = scope.$parent;
          }

          controllerScope = /** @type {ng.Scope} */ (controllerScope || scope);

          let transcludeFn = nodeLinkState._transcludeFn;

          if (boundTranscludeFn) {
            /** @type {ControllersBoundTranscludeState} */
            const transcludeState = {
              _boundTranscludeFn: boundTranscludeFn,
              _elementControllers: elementControllers,
              _hasElementTranscludeDirective:
                nodeLinkState._hasElementTranscludeDirective,
              _scopeToChild: scopeToChild,
              _elementRef: $element,
            };

            const controllersBoundTransclude = function (
              /** @type {import("../scope/scope.js").Scope | CloneAttachFn | undefined} */ scopeParam,
              /** @type {CloneAttachFn | Node | null | undefined} */ cloneAttachFn,
              /** @type {Node | null | undefined} */ _futureParentElement,
              /** @type {string | number | undefined} */ slotName,
            ) {
              transcludeState._scopeToChild = scopeToChild;
              transcludeState._elementRef = $element;
              transcludeState._elementControllers = elementControllers;

              return invokeControllersBoundTransclude(
                transcludeState,
                scopeParam,
                cloneAttachFn,
                _futureParentElement,
                slotName,
              );
            };

            /** @type {any} */
            const newTranscludeFn = /** @type {any} */ (
              controllersBoundTransclude
            );

            newTranscludeFn._boundTransclude = boundTranscludeFn;
            newTranscludeFn.isSlotFilled = function (
              /** @type {string | number} */ slotName,
            ) {
              return !!this._boundTransclude._slots[slotName];
            };
            transcludeFn = newTranscludeFn;
          }

          const controllerDirectives =
            nodeLinkState._controllerDirectives || nullObject();

          if (nodeLinkState._controllerDirectives) {
            elementControllers = setupControllers(
              $element,
              attrs,
              /** @type {ng.TranscludeFn} */ (transcludeFn),
              nodeLinkState._controllerDirectives,
              /** @type {ng.Scope} */ (isolateScope || scope),
              scope,
              nodeLinkState._newIsolateScopeDirective,
            );
          }

          if (nodeLinkState._newIsolateScopeDirective && isolateScope) {
            isolateScope.$target._isolateBindings = /** @type {any} */ (
              nodeLinkState._newIsolateScopeDirective
            )._isolateBindings;
            scopeBindingInfo = initializeDirectiveBindings(
              scope,
              attrs,
              isolateScope,
              isolateScope._isolateBindings,
              nodeLinkState._newIsolateScopeDirective,
            );

            if (scopeBindingInfo.removeWatches) {
              isolateScope.$on("$destroy", scopeBindingInfo.removeWatches);
            }
          }

          for (const name in elementControllers) {
            const controllerDirective = controllerDirectives[name];

            const controller = elementControllers[name];

            const bindings = /** @type {any} */ (controllerDirective)._bindings
              .bindToController;

            const controllerInstance = controller();

            controller.instance = controllerScope.$new(controllerInstance);
            setCacheData(
              $element.node,
              `$${controllerDirective.name}Controller`,
              controller.instance,
            );
            controller.bindingInfo = initializeDirectiveBindings(
              /** @type {ng.Scope} */ (controllerScope),
              attrs,
              controller.instance,
              bindings,
              controllerDirective,
            );
          }

          if (nodeLinkState._controllerDirectives) {
            entries(controllerDirectives).forEach(
              ([name, controllerDirective]) => {
                const { require } = controllerDirective;

                if (
                  controllerDirective.bindToController &&
                  !isArray(require) &&
                  isObject(require)
                ) {
                  extend(
                    elementControllers[name].instance,
                    getControllers(
                      name,
                      require,
                      $element.element,
                      elementControllers,
                    ),
                  );
                }
              },
            );
          }

          if (elementControllers) {
            values(elementControllers).forEach((controller) => {
              const controllerInstance = controller.instance;

              if (isFunction(controllerInstance.$onChanges)) {
                try {
                  controllerInstance.$onChanges(
                    controller.bindingInfo.initialChanges,
                  );
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              if (isFunction(controllerInstance.$onInit)) {
                try {
                  controllerInstance.$target.$onInit();
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              if (isFunction(controllerInstance.$onDestroy)) {
                /** @type {ng.Scope} */ (controllerScope).$on(
                  "$destroy",
                  () => {
                    controllerInstance.$onDestroy();
                  },
                );
              }
            });
          }

          for (let i = 0, ii = nodeLinkState._preLinkFns.length; i < ii; i++) {
            const preLinkFn = /** @type {LinkFnRecord} */ (
              nodeLinkState._preLinkFns[i]
            );

            const controllers =
              preLinkFn._require &&
              getControllers(
                preLinkFn._directiveName,
                preLinkFn._require,
                $element.element,
                elementControllers,
              );

            try {
              invokeLinkFnRecord(
                preLinkFn,
                isolateScope,
                scope,
                $element.node,
                attrs,
                controllers,
                transcludeFn,
              );
            } catch (err) {
              $exceptionHandler(err);
            }
          }

          if (
            nodeLinkState._newIsolateScopeDirective &&
            (nodeLinkState._newIsolateScopeDirective.template ||
              nodeLinkState._newIsolateScopeDirective.templateUrl === null)
          ) {
            scopeToChild = isolateScope || scope;
          }

          if (
            childLinkFn &&
            linkNode.childNodes &&
            linkNode.childNodes.length
          ) {
            childLinkFn(
              scopeToChild,
              new NodeRef(linkNode.childNodes),
              boundTranscludeFn,
            );
          }

          for (let i = nodeLinkState._postLinkFns.length - 1; i >= 0; i--) {
            const postLinkFn = /** @type {LinkFnRecord} */ (
              nodeLinkState._postLinkFns[i]
            );

            const controllers =
              postLinkFn._require &&
              getControllers(
                postLinkFn._directiveName,
                postLinkFn._require,
                /** @type {Element} */ ($element.node),
                elementControllers,
              );

            try {
              if (postLinkFn._isolateScope && isolateScope) {
                setIsolateScope($element.element, isolateScope);
              }

              invokeLinkFnRecord(
                postLinkFn,
                isolateScope,
                scope,
                $element.node,
                attrs,
                controllers,
                transcludeFn,
              );
            } catch (err) {
              $exceptionHandler(err);
            }
          }

          if (elementControllers) {
            values(elementControllers).forEach((controller) => {
              const controllerInstance = controller.instance;

              if (isFunction(controllerInstance.$postLink)) {
                controllerInstance.$postLink();
              }
            });
          }
        }

        /**
         * Applies a sorted set of directives to a single node and produces the node-level link context.
         *
         * Responsibilities:
         * - Run directive `compile()` functions (and collect pre/post link fns).
         * - Inline templates / handle `replace`, `templateUrl`, and transclusion.
         * - Track terminal directives and scope requirements for later linking.
         *
         * @param {InternalDirective[]} directives
         *   Collected directives for this node (must be pre-sorted by priority).
         * @param {Node | Element} compileNode
         *   The DOM node to apply directive compilation against (may be replaced during compilation).
         * @param {Attributes} templateAttrs
         *   Shared, normalized attributes for the node at compile-time.
         * @param {ChildTranscludeOrLinkFn} transcludeFn
         *   Parent transclusion/link function passed down during compilation.
         * @param {InternalDirective | null | undefined} originalReplaceDirective
         *   The original directive that triggered a `replace` (ignored when compiling transclusion/template).
         * @param {Array<LinkFnRecord>} [preLinkFns]
         *   Accumulator for pre-link functions (executed in registration order).
         * @param {Array<LinkFnRecord>} [postLinkFns]
         *   Accumulator for post-link functions (executed in reverse order).
         * @param {PreviousCompileContext} [previousCompileContext]
         *   Internal bookkeeping for replace/transclusion/templateUrl compilation passes.
         *
         * @returns {NodeLinkFnCtx}
         *   The node link context (nodeLinkFn + flags + transclusion/template metadata).
         */
        function applyDirectivesToNode(
          directives,
          compileNode,
          templateAttrs,
          transcludeFn,
          originalReplaceDirective,
          preLinkFns,
          postLinkFns,
          previousCompileContext,
        ) {
          previousCompileContext = previousCompileContext || {};
          preLinkFns = /** @type {any[]} */ (preLinkFns || []);
          postLinkFns = /** @type {any[]} */ (postLinkFns || []);

          let terminalPriority = -Number.MAX_VALUE;

          let terminal = false;

          let {
            _newScopeDirective,
            _controllerDirectives,
            _newIsolateScopeDirective,
            _templateDirective,
            _nonTlbTranscludeDirective,
            _hasElementTranscludeDirective,
          } = previousCompileContext;

          const { _ctxNodeRef, _parentNodeRef } = previousCompileContext;

          let hasTranscludeDirective = false;

          let hasTemplate = false;

          let compileNodeRef = new NodeRef(compileNode);

          const { _index } = previousCompileContext;

          templateAttrs._nodeRef = compileNodeRef;
          /** @type {InternalDirective} */
          let directive;

          /** @type {string} */
          let directiveName;

          let $template;

          let replaceDirective = originalReplaceDirective;

          /** @type {import("./interface.ts").ChildTranscludeOrLinkFn} */
          let childTranscludeFn = transcludeFn;

          let didScanForMultipleTransclusion = false;

          let mightHaveMultipleTransclusionError = false;

          let directiveValue;

          /** @type {NodeLinkFn | StoredNodeLinkFn | undefined} */
          let nodeLinkFn;

          let nodeLinkFnState;

          // executes all directives on the current element
          for (let i = 0, ii = directives.length; i < ii; i++) {
            directive = directives[i];
            const directivePriority = directive.priority || 0;

            if (terminalPriority > directivePriority) {
              break; // prevent further processing of directives
            }

            directiveValue = directive.scope;

            if (directiveValue) {
              // skip the check for directives with async templates, we'll check the derived sync
              // directive when the template arrives
              if (!directive.templateUrl) {
                if (isObject(directiveValue)) {
                  // This directive is trying to add an isolated scope.
                  // Check that there is no scope of any kind already
                  assertNoDuplicate(
                    "new/isolated scope",
                    /** @type {any} */ (
                      _newIsolateScopeDirective || _newScopeDirective
                    ),
                    directive,
                    compileNodeRef,
                  );
                  _newIsolateScopeDirective = directive;
                } else {
                  // This directive is trying to add a child scope.
                  // Check that there is no isolated scope already
                  assertNoDuplicate(
                    "new/isolated scope",
                    /** @type {any} */ (_newIsolateScopeDirective),
                    directive,
                    compileNodeRef,
                  );
                }
              }

              _newScopeDirective = _newScopeDirective || directive;
            }

            directiveName = directive.name || "";

            // If we encounter a condition that can result in transclusion on the directive,
            // then scan ahead in the remaining directives for others that may cause a multiple
            // transclusion error to be thrown during the compilation process.  If a matching directive
            // is found, then we know that when we encounter a transcluded directive, we need to eagerly
            // compile the `transclude` function rather than doing it lazily in order to throw
            // exceptions at the correct time
            const hasReplacedTemplate =
              directive.replace &&
              (directive.templateUrl || directive.template);

            const shouldTransclude =
              directive.transclude &&
              !EXCLUDED_DIRECTIVES.includes(directiveName);

            if (
              !didScanForMultipleTransclusion &&
              (hasReplacedTemplate || shouldTransclude)
            ) {
              let candidateDirective;

              for (
                let scanningIndex = i + 1;
                (candidateDirective = directives[scanningIndex++]);
              ) {
                if (
                  (candidateDirective.transclude &&
                    !EXCLUDED_DIRECTIVES.includes(
                      candidateDirective.name || "",
                    )) ||
                  (candidateDirective.replace &&
                    (candidateDirective.templateUrl ||
                      candidateDirective.template))
                ) {
                  mightHaveMultipleTransclusionError = true;
                  break;
                }
              }

              didScanForMultipleTransclusion = true;
            }

            if (!directive.templateUrl && directive.controller) {
              _controllerDirectives = _controllerDirectives || nullObject();
              assertNoDuplicate(
                `'${directiveName}' controller`,
                /** @type {any} */ (_controllerDirectives[directiveName]),
                directive,
                compileNodeRef,
              );
              _controllerDirectives[directiveName] = directive;
            }

            directiveValue = directive.transclude;

            if (directiveValue) {
              hasTranscludeDirective = true;

              // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
              // This option should only be used by directives that know how to safely handle element transclusion,
              // where the transcluded nodes are added or replaced after linking.
              if (!EXCLUDED_DIRECTIVES.includes(directiveName)) {
                assertNoDuplicate(
                  "transclusion",
                  /** @type {any} */ (_nonTlbTranscludeDirective),
                  directive,
                  compileNodeRef,
                );
                _nonTlbTranscludeDirective = directive;
              }

              if (directiveValue === "element") {
                _hasElementTranscludeDirective = true;
                terminalPriority = directivePriority;
                $template = compileNodeRef;
                compileNodeRef = new NodeRef(document.createComment(""));
                templateAttrs._nodeRef = compileNodeRef;
                compileNode = compileNodeRef.node;

                if (_ctxNodeRef) {
                  _ctxNodeRef.node = compileNode;
                }
                replaceWith(
                  new NodeRef(/** @type {Element} */ ($template._element)),
                  compileNode,
                  _index,
                );

                childTranscludeFn = compilationGenerator(
                  mightHaveMultipleTransclusionError,
                  /** @type {Element} */ ($template._element),
                  transcludeFn,
                  terminalPriority,
                  replaceDirective ? replaceDirective.name : undefined,
                  {
                    // Don't pass in:
                    // - _controllerDirectives - otherwise we'll create duplicates controllers
                    // - _newIsolateScopeDirective or _templateDirective - combining templates with
                    //   element transclusion doesn't make sense.
                    //
                    // We need only _nonTlbTranscludeDirective so that we prevent putting transclusion
                    // on the same element more than once.
                    _nonTlbTranscludeDirective,
                  },
                );
              } else {
                const slots = nullObject();

                /** @type {NodeList | DocumentFragment} */
                let nodes;

                if (!isObject(directiveValue)) {
                  //
                  // Clone childnodes before clearing contents on transcluded directives
                  // Create a temporary container to preserve separate text nodes without browser normalization
                  // (see https://github.com/angular/angular.js/issues/14924)
                  const tempContainer = document.createElement("div");

                  const { childNodes } = compileNode;

                  for (
                    let childIndex = 0, childCount = childNodes.length;
                    childIndex < childCount;
                    childIndex++
                  ) {
                    tempContainer.appendChild(
                      childNodes[childIndex].cloneNode(true),
                    );
                  }
                  nodes = tempContainer.childNodes;
                } else {
                  // We have transclusion slots,
                  // collect them up, compile them and store their transclusion functions
                  // Use a temporary container to preserve separate text nodes without browser normalization
                  // (see https://github.com/angular/angular.js/issues/14924)
                  const tempContainer = document.createElement("div");

                  const slotMap = nullObject();

                  const filledSlots = nullObject();

                  // Parse the element selectors
                  entries(directiveValue).forEach(
                    ([slotName, elementSelector]) => {
                      // If an element selector starts with a ? then it is optional
                      const optional = elementSelector.charAt(0) === "?";

                      elementSelector = optional
                        ? elementSelector.substring(1)
                        : elementSelector;

                      slotMap[elementSelector] = slotName;

                      // We explicitly assign `null` since this implies that a slot was defined but not filled.
                      // Later when calling boundTransclusion functions with a slot name we only error if the
                      // slot is `undefined`
                      slots[slotName] = null;

                      // filledSlots contains `true` for all slots that are either optional or have been
                      // filled. This is used to check that we have not missed any required slots
                      filledSlots[slotName] = optional;
                    },
                  );

                  // Clone childnodes before distributing to slots
                  // Clone each node individually to prevent browser DOM normalization
                  // which can merge adjacent text nodes (see https://github.com/angular/angular.js/issues/14924)
                  const { childNodes } = compileNode;

                  // Add the matching elements into their slot
                  for (
                    let childIndex = 0, childCount = childNodes.length;
                    childIndex < childCount;
                    childIndex++
                  ) {
                    const node = childNodes[childIndex].cloneNode(true);

                    const slotName =
                      slotMap[
                        directiveNormalize(
                          getNodeName(/** @type {Element} */ (node)),
                        )
                      ];

                    if (slotName) {
                      filledSlots[slotName] = true;
                      slots[slotName] =
                        slots[slotName] || document.createDocumentFragment();
                      slots[slotName].appendChild(node);
                    } else {
                      tempContainer.appendChild(node);
                    }
                  }

                  // Check for required slots that were not filled
                  entries(filledSlots).forEach(([slotName, filled]) => {
                    if (!filled) {
                      throw $compileMinErr(
                        "reqslot",
                        "Required transclusion slot `{0}` was not filled.",
                        slotName,
                      );
                    }
                  });

                  for (const slotName in slots) {
                    if (slots[slotName]) {
                      // Only define a transclusion function if the slot was filled
                      // Convert to static array to prevent DOM normalization of text nodes
                      const slotCompileNodes = slots[slotName].childNodes;

                      slots[slotName] = compilationGenerator(
                        mightHaveMultipleTransclusionError,
                        slotCompileNodes,
                        transcludeFn,
                        undefined,
                        undefined,
                        previousCompileContext,
                      );
                    }
                  }

                  nodes = tempContainer.childNodes;
                }

                emptyElement(/** @type {Element} */ (compileNode)); // clear contents on transcluded directives

                // lazily compile transcluded template and generate a transcluded link function

                childTranscludeFn = compilationGenerator(
                  mightHaveMultipleTransclusionError,
                  nodes,
                  transcludeFn,
                  undefined,
                  undefined,
                  {
                    _needsNewScope:
                      /** @type {any} */ (directive)._isolateScope ||
                      /** @type {any} */ (directive)._newScope,
                  },
                );
                /** @type {import("./interface.ts").TranscludeFn} */ (
                  childTranscludeFn
                )._slots = slots;
              }
            }

            if (directive.template) {
              hasTemplate = true;
              assertNoDuplicate(
                "template",
                /** @type {any} */ (_templateDirective),
                directive,
                compileNodeRef,
              );
              _templateDirective = directive;

              directiveValue = isFunction(directive.template)
                ? directive.template(
                    /** @type {HTMLElement} */ (compileNodeRef.node),
                    templateAttrs,
                  )
                : directive.template;

              directiveValue = denormalizeTemplate(directiveValue);

              if (directive.replace) {
                replaceDirective = directive;

                if (isTextNode(directiveValue)) {
                  $template = [];
                } else {
                  $template = wrapTemplate(
                    directive.templateNamespace,
                    trim(directiveValue),
                  );
                }

                if (isString($template)) {
                  $template = Array.from(
                    createNodelistFromHTML($template),
                  ).filter((x) => x.nodeType === NodeType._ELEMENT_NODE);
                }
                compileNode = $template[0];

                if (
                  $template.length !== 1 ||
                  compileNode.nodeType !== NodeType._ELEMENT_NODE
                ) {
                  throw $compileMinErr(
                    "tplrt",
                    "Template for directive '{0}' must have exactly one root element. {1}",
                    directiveName,
                    "",
                  );
                }

                replaceWith(compileNodeRef, compileNode);

                if (_parentNodeRef && _index !== undefined) {
                  /** @type {NodeRef} */ (_parentNodeRef)._setIndex(
                    _index,
                    compileNode,
                  );
                }

                /** @type {Attributes} */
                const newTemplateAttrs = /** @type {any} */ ({ $attr: {} });

                // combine directives from the original node and from the template:
                // - take the array of directives for this element
                // - split it into two parts, those that already applied (processed) and those that weren't (unprocessed)
                // - collect directives from the template and sort them by priority
                // - combine directives as: processed + template + unprocessed
                const _templateDirectives = collectDirectives(
                  /** @type {Element} */ (compileNode),
                  newTemplateAttrs,
                );

                const unprocessedDirectives = directives.splice(
                  i + 1,
                  directives.length - (i + 1),
                );

                if (_newIsolateScopeDirective || _newScopeDirective) {
                  // The original directive caused the current element to be replaced but this element
                  // also needs to have a new scope, so we need to tell the template directives
                  // that they would need to get their scope from further up, if they require transclusion
                  markDirectiveScope(
                    _templateDirectives,
                    _newIsolateScopeDirective,
                    _newScopeDirective,
                  );
                }
                directives = directives
                  .concat(_templateDirectives)
                  .concat(unprocessedDirectives);

                mergeTemplateAttributes(templateAttrs, newTemplateAttrs);

                ii = directives.length;
              } else {
                if (compileNodeRef._isElement()) {
                  compileNodeRef.element.innerHTML = directiveValue;
                }
              }
            }

            if (directive.templateUrl) {
              hasTemplate = true;
              assertNoDuplicate(
                "template",
                /** @type {any} */ (_templateDirective),
                directive,
                compileNodeRef,
              );
              _templateDirective = directive;

              if (directive.replace) {
                replaceDirective = directive;
              }

              ({ _nodeLinkFn: nodeLinkFn, _nodeLinkFnState: nodeLinkFnState } =
                /** @type {any} */ (
                  compileTemplateUrl(
                    directives.splice(i, directives.length - i),
                    compileNodeRef,
                    templateAttrs,
                    /** @type {Element} */ (compileNode),
                    hasTranscludeDirective && childTranscludeFn,
                    preLinkFns,
                    postLinkFns,
                    {
                      _index,
                      _controllerDirectives,
                      _newScopeDirective:
                        _newScopeDirective !== directive && _newScopeDirective,
                      _newIsolateScopeDirective,
                      _templateDirective,
                      _nonTlbTranscludeDirective,
                      _futureParentElement:
                        previousCompileContext._futureParentElement,
                    },
                  )
                ));
              ii = directives.length;
            } else if (directive.compile) {
              try {
                /** @type {any} */
                const linkFn = directive.compile(
                  /** @type {HTMLElement} */ (compileNodeRef._getAny()),
                  templateAttrs,
                  childTranscludeFn,
                );

                const context = directive._originalDirective || directive;

                const isolateScope =
                  _newIsolateScopeDirective === directive ||
                  !!directive._isolateScope;

                if (isFunction(linkFn)) {
                  const linkCtx = linkFn._linkCtx;

                  pushLinkFnRecord(
                    postLinkFns,
                    isDefined(linkCtx) ? linkFn : bind(context, linkFn),
                    directive.require,
                    directiveName,
                    isolateScope,
                    linkCtx,
                  );
                } else if (linkFn) {
                  const preLinkCtx = linkFn._preLinkCtx || linkFn._linkCtx;

                  const postLinkCtx = linkFn._postLinkCtx || linkFn._linkCtx;

                  pushLinkFnRecord(
                    preLinkFns,
                    isDefined(preLinkCtx)
                      ? /** @type {ng.PublicLinkFn} */ (linkFn).pre
                      : bind(
                          context,
                          /** @type {ng.PublicLinkFn} */ (linkFn).pre,
                        ),
                    directive.require,
                    directiveName,
                    isolateScope,
                    preLinkCtx,
                  );
                  pushLinkFnRecord(
                    postLinkFns,
                    isDefined(postLinkCtx)
                      ? /** @type {ng.PublicLinkFn} */ (linkFn).post
                      : bind(
                          context,
                          /** @type {ng.PublicLinkFn} */ (linkFn).post,
                        ),
                    directive.require,
                    directiveName,
                    isolateScope,
                    postLinkCtx,
                  );
                }
              } catch (err) {
                $exceptionHandler(err);
              }
            }

            if (directive.terminal) {
              terminal = true;
              terminalPriority = Math.max(terminalPriority, directivePriority);
            }
          }

          previousCompileContext._hasElementTranscludeDirective =
            _hasElementTranscludeDirective;

          if (!nodeLinkFn) {
            nodeLinkFn = /** @type {StoredNodeLinkFn} */ (
              invokeStoredNodeLinkFn
            );
            nodeLinkFnState = {
              _compileNode: compileNode,
              _templateAttrs: templateAttrs,
              _transcludeFn: childTranscludeFn,
              _controllerDirectives,
              _newIsolateScopeDirective,
              _newScopeDirective,
              _hasElementTranscludeDirective,
              _preLinkFns: preLinkFns,
              _postLinkFns: postLinkFns,
            };
          }

          // might be normal or delayed nodeLinkFn depending on if templateUrl is present
          return {
            _nodeLinkFn: nodeLinkFn,
            _nodeLinkFnState: nodeLinkFnState,
            _terminal: terminal,
            _transclude: childTranscludeFn,
            _transcludeOnThisElement: hasTranscludeDirective,
            _templateOnThisElement: hasTemplate,
            _newScope: !!(
              _newScopeDirective && _newScopeDirective.scope === true
            ),
          };
        }

        /**
         *
         * @param {string} directiveName
         * @param {string | Array<any> | Record<string, any>} require
         * @param {Element | undefined} $element
         * @param {*} elementControllers
         * @returns {any}
         */
        function getControllers(
          directiveName,
          require,
          $element,
          elementControllers,
        ) {
          /** @type {any} */
          let value;

          if (isString(require)) {
            const match = /** @type {RegExpMatchArray} */ (
              require.match(REQUIRE_PREFIX_REGEXP)
            );

            const name = require.substring(match[0].length);

            const inheritType = match[1] || match[3];

            const optional = match[2] === "?";

            // If only parents then start at the parent element
            if (inheritType === "^^") {
              if ($element && $element.parentElement) {
                $element = $element.parentElement;
              } else {
                $element = undefined;
              }
              // Otherwise attempt getting the controller from elementControllers in case
              // the element is transcluded (and has no data) and to avoid .data if possible
            } else {
              value = elementControllers && elementControllers[name];
              value = value && value.instance;
            }

            if (!value) {
              const dataName = `$${name}Controller`;

              if (
                inheritType === "^^" &&
                $element &&
                $element.nodeType === NodeType._DOCUMENT_NODE
              ) {
                // inheritedData() uses the documentElement when it finds the document, so we would
                // require from the element itself.
                value = null;
              } else {
                value = $element
                  ? inheritType
                    ? getInheritedData($element, dataName)
                    : getCacheData($element, dataName)
                  : undefined;
              }
            }

            if (!value && !optional) {
              throw $compileMinErr(
                "ctreq",
                "Controller '{0}', required by directive '{1}', can't be found!",
                name,
                directiveName,
              );
            }
          } else if (isArray(require)) {
            value = [];

            for (let i = 0, ii = require.length; i < ii; i++) {
              value[i] = getControllers(
                directiveName,
                require[i],
                $element,
                elementControllers,
              );
            }
          } else if (isObject(require)) {
            value = {};
            entries(require).forEach(([property, controller]) => {
              value[property] = getControllers(
                directiveName,
                controller,
                $element,
                elementControllers,
              );
            });
          }

          return value || null;
        }

        /**
         * @param {NodeRef} $element
         * @param {Attributes} attrs
         * @param {ng.TranscludeFn} transcludeFn
         * @param {{ [x: string]: any; }} _controllerDirectives
         * @param {ng.Scope} isolateScope
         * @param {ng.Scope} scope
         * @param {any} _newIsolateScopeDirective
         * @returns {any}
         */
        function setupControllers(
          $element,
          attrs,
          transcludeFn,
          _controllerDirectives,
          isolateScope,
          scope,
          _newIsolateScopeDirective,
        ) {
          const elementControllers = nullObject();

          for (const controllerKey in _controllerDirectives) {
            const directive = _controllerDirectives[controllerKey];

            const locals = {
              $scope:
                directive === _newIsolateScopeDirective ||
                directive._isolateScope
                  ? isolateScope
                  : scope,
              $element: /** @type {any} */ ($element.node),
              $attrs: attrs,
              $transclude: transcludeFn,
            };

            let { controller } = directive;

            if (controller === "@") {
              controller = /** @type {any} */ (attrs)[directive.name];
            }

            const controllerInstance = $controller(
              controller,
              locals,
              true,
              directive.controllerAs,
            );

            // For directives with element transclusion the element is a comment.
            // In this case .data will not attach any data.
            // Instead, we save the controllers for the element in a local hash and attach to .data
            // later, once we have the actual element.
            elementControllers[directive.name] = controllerInstance;

            if ($element._isElement()) {
              setCacheData(
                $element.element,
                `$${directive.name}Controller`,
                controllerInstance.instance,
              );
            }
          }

          return elementControllers;
        }

        // Depending upon the context in which a directive finds itself it might need to have a new isolated
        // or child scope created. For instance:
        // * if the directive has been pulled into a template because another directive with a higher priority
        // asked for element transclusion
        // * if the directive itself asks for transclusion but it is at the root of a template and the original
        // element was replaced. See https://github.com/angular/angular.js/issues/12936
        /**
         * @param {any[]} directives
         * @param {any} isolateScope
         * @param {any} [newScope]
         */
        function markDirectiveScope(directives, isolateScope, newScope) {
          for (let j = 0, jj = directives.length; j < jj; j++) {
            directives[j] = inherit(directives[j], {
              _isolateScope: isolateScope,
              _newScope: newScope,
            });
          }
        }

        /**
         * looks up the directive and decorates it with exception handling and proper parameters. We
         * call this the boundDirective.
         * @param {string} name name of the directive to look up.
         * @param {string} location The directive must be found in specific format.
        String containing any of these characters:
        
        * `E`: element name
        * `A': attribute
         * @returns {InternalDirective | false} true if directive was added.
         * @param {InternalDirective[]} tDirectives
         * @param {number | undefined} maxPriority
         */
        function addDirective(tDirectives, name, location, maxPriority) {
          /** @type {InternalDirective | false} */
          let match = false;

          const maxPriorityValue = isUndefined(maxPriority)
            ? Number.MAX_VALUE
            : /** @type {number} */ (maxPriority);

          if (hasOwn(hasDirectives, name)) {
            const directives = hasOwn(directiveLookupCache, name)
              ? directiveLookupCache[name]
              : (directiveLookupCache[name] = $injector.get(
                  name + DirectiveSuffix,
                ));

            for (
              let directive,
                i = 0,
                ii = /** @type {any[]} */ (directives).length;
              i < ii;
              i++
            ) {
              directive = /** @type {any[]} */ (directives)[i];

              if (
                maxPriorityValue > (directive.priority || 0) &&
                directive.restrict.indexOf(location) !== -1
              ) {
                if (!directive._bindings) {
                  const bindings = (directive._bindings =
                    parseDirectiveBindings(directive, directive.name));

                  if (isObject(bindings.isolateScope)) {
                    directive._isolateBindings = bindings.isolateScope;
                  }
                }
                tDirectives.push(directive);
                match = directive;
              }
            }
          }

          return match;
        }

        /**
         * When the element is replaced with HTML template then the new attributes
         * on the template need to be merged with the existing attributes in the DOM.
         * The desired effect is to have both of the attributes present.
         *
         * @param {Attributes} dst destination attributes (original DOM)
         * @param {Attributes} src source attributes (from the directive template)
         */
        function mergeTemplateAttributes(dst, src) {
          const dstAny = /** @type {any} */ (dst);

          const srcAny = /** @type {any} */ (src);

          const srcAttr = src.$attr;

          const dstAttr = dst.$attr;

          // reapply the old attributes to the new element
          entries(dstAny).forEach(([key, value]) => {
            if (key[0] !== "$" && key[0] !== "_") {
              if (srcAny[key] && srcAny[key] !== value) {
                if (value.length) {
                  value += (key === "style" ? ";" : " ") + srcAny[key];
                } else {
                  value = srcAny[key];
                }
              }
              dst.$set(key, value, true, srcAttr[key]);
            }
          });

          // copy the new attributes on the old attrs object
          entries(srcAny).forEach(([key, value]) => {
            // Check if we already set this attribute in the loop above.
            // `dst` will never contain hasOwnProperty as DOM parser won't let it.
            // You will get an "InvalidCharacterError: DOM Exception 5" error if you
            // have an attribute like "has-own-property" or "data-has-own-property", etc.
            if (!hasOwn(dst, key) && key.charAt(0) !== "$") {
              dstAny[key] = value;

              if (key !== "class" && key !== "style") {
                dstAttr[key] = srcAttr[key];
              }
            }
          });
        }

        /**
         *
         * @param {InternalDirective[]} directives
         * @param {NodeRef} $compileNode
         * @param {Attributes} tAttrs
         * @param {any} $rootElement
         * @param {*} childTranscludeFn
         * @param {Array<any>} preLinkFns
         * @param {Array<any>} postLinkFns
         * @param {*} previousCompileContext
         * @returns
         */
        function compileTemplateUrl(
          directives,
          $compileNode,
          tAttrs,
          $rootElement,
          childTranscludeFn,
          preLinkFns,
          postLinkFns,
          previousCompileContext,
        ) {
          const origAsyncDirective = /** @type {InternalDirective} */ (
            directives.shift()
          );

          /** @type {DelayedTemplateLinkState} */
          const delayedState = {
            _linkQueue: [],
            _afterTemplateChildLinkFn: null,
            _beforeTemplateCompileNode: $compileNode._getAny(),
            _compileNodeRef: $compileNode,
            _origAsyncDirective: origAsyncDirective,
            _previousCompileContext: previousCompileContext,
          };

          const derivedSyncDirective = /** @type {InternalDirective} */ (
            inherit(origAsyncDirective, {
              templateUrl: null,
              transclude: null,
              replace: null,
              _originalDirective: origAsyncDirective,
            })
          );

          /** @type {string} */
          let templateUrl;

          if (isFunction(origAsyncDirective.templateUrl)) {
            templateUrl =
              /** @type { ((element: Element, tAttrs: Attributes) => string) } */ (
                origAsyncDirective.templateUrl
              )($compileNode.element, tAttrs);
          } else {
            // eslint-disable-next-line prefer-destructuring
            templateUrl = /** @type {string} */ (
              origAsyncDirective.templateUrl
            );
          }
          const { templateNamespace } = origAsyncDirective;

          emptyElement($compileNode.element);

          $templateRequest(templateUrl)
            .then((content) => {
              /** @type {Element} */
              let compileNode;

              let tempTemplateAttrs;

              let $template;

              content = denormalizeTemplate(content);

              if (origAsyncDirective.replace) {
                if (isTextNode(content)) {
                  $template = [];
                } else if (isString(content)) {
                  $template = Array.from(
                    createNodelistFromHTML(content),
                  ).filter(
                    (node) =>
                      node.nodeType !== NodeType._COMMENT_NODE &&
                      node.nodeType !== NodeType._TEXT_NODE,
                  );
                } else {
                  $template = wrapTemplate(templateNamespace, trim(content));
                }
                compileNode = $template[0];

                if (
                  $template.length !== 1 ||
                  compileNode.nodeType !== NodeType._ELEMENT_NODE
                ) {
                  throw $compileMinErr(
                    "tplrt",
                    "Template for directive '{0}' must have exactly one root element. {1}",
                    origAsyncDirective.name,
                    templateUrl,
                  );
                }

                /** @type {Attributes} */
                tempTemplateAttrs = /** @type {any} */ ({ $attr: {} });

                replaceWith(
                  $compileNode,
                  compileNode,
                  previousCompileContext._index,
                );

                const _templateDirectives = collectDirectives(
                  compileNode,
                  tempTemplateAttrs,
                );

                if (isObject(origAsyncDirective.scope)) {
                  // the original directive that caused the template to be loaded async required
                  // an isolate scope
                  markDirectiveScope(_templateDirectives, true);
                }
                directives = _templateDirectives.concat(directives);

                mergeTemplateAttributes(tAttrs, tempTemplateAttrs);
              } else {
                compileNode = /** @type {Element} */ (
                  delayedState._beforeTemplateCompileNode
                );
                $compileNode.element.innerHTML = content;
              }

              directives.unshift(derivedSyncDirective);
              delayedState._afterTemplateNodeLinkFnCtx = applyDirectivesToNode(
                directives,
                compileNode,
                tAttrs,
                childTranscludeFn,
                origAsyncDirective,
                preLinkFns,
                postLinkFns,
                { ...previousCompileContext, _ctxNodeRef: $compileNode },
              );

              if ($rootElement) {
                entries($rootElement).forEach(([i, node]) => {
                  if (node === compileNode) {
                    $rootElement[i] = $compileNode;
                  }
                });
              }
              delayedState._compiledNode = compileNode;
              delayedState._afterTemplateChildLinkFn = compileNodes(
                new NodeRef($compileNode._getAny().childNodes),
                childTranscludeFn,
              );

              for (
                let queueIndex = 0;
                delayedState._linkQueue &&
                queueIndex < delayedState._linkQueue.length;
                queueIndex += 3
              ) {
                const scope = /** @type {ng.Scope | undefined} */ (
                  delayedState._linkQueue[queueIndex]
                );

                const beforeTemplateLinkNode = /** @type {any} */ (
                  delayedState._linkQueue[queueIndex + 1]
                );

                const boundTranscludeFn =
                  /** @type {BoundTranscludeFn | null | undefined} */ (
                    delayedState._linkQueue[queueIndex + 2]
                  );

                if (!scope) {
                  continue;
                }

                replayResolvedTemplateNodeLink(
                  delayedState,
                  scope,
                  beforeTemplateLinkNode,
                  boundTranscludeFn,
                );
              }
              delayedState._linkQueue = null;
            })
            .catch((error) => {
              if (isError(error)) {
                $exceptionHandler(error);
              } else {
                $exceptionHandler(new Error(error));
              }
            });

          return {
            _nodeLinkFn: invokeDelayedTemplateNodeLinkFn,
            _nodeLinkFnState: delayedState,
          };
        }

        /**
         * @param {string} what
         * @param {{ name: any; }} previousDirective
         * @param {{ name: any; }} directive
         * @param {NodeRef} element
         */
        function assertNoDuplicate(
          what,
          previousDirective,
          directive,
          element,
        ) {
          if (previousDirective) {
            throw $compileMinErr(
              "multidir",
              "Multiple directives [{0}, {1}] asking for {3} on: {4}",
              previousDirective.name,
              directive.name,
              what,
              startingTag(/** @tupe {NodeRef} */ element._getAny()),
            );
          }
        }

        /**
         * @param {ng.Directive[]} directives
         * @param {string} text
         */
        function addTextInterpolateDirective(directives, text) {
          const interpolateFn = $interpolate(text, true);

          if (interpolateFn) {
            /** @type {TextInterpolateLinkState} */
            const linkState = {
              _interpolateFn: interpolateFn,
              _watchExpression: buildInterpolationWatchExpression(
                interpolateFn.expressions,
              ),
            };

            directives.push({
              priority: 0,
              compile: () =>
                /** @type {any} */ ({
                  post: textInterpolateLinkFn,
                  _postLinkCtx: linkState,
                }),
            });
          }
        }

        /**
         * @param {string} nodeName
         * @param {string} attrNormalizedName
         * @returns {string|undefined}
         */
        function getTrustedAttrContext(nodeName, attrNormalizedName) {
          if (attrNormalizedName === "srcdoc") {
            return $sce.HTML;
          }

          // All nodes with src attributes require a RESOURCE_URL value, except for
          // img and various html5 media nodes, which require the MEDIA_URL context.
          if (attrNormalizedName === "src" || attrNormalizedName === "ngSrc") {
            if (
              ["img", "video", "audio", "source", "track"].indexOf(nodeName) ===
              -1
            ) {
              return $sce.RESOURCE_URL;
            }

            return $sce.MEDIA_URL;
          }

          if (attrNormalizedName === "xlinkHref") {
            // Some xlink:href are okay, most aren't
            if (nodeName === "image") {
              return $sce.MEDIA_URL;
            }

            if (nodeName === "a") {
              return $sce.URL;
            }

            return $sce.RESOURCE_URL;
          }

          if (
            // Formaction
            (nodeName === "form" && attrNormalizedName === "action") ||
            // If relative URLs can go where they are not expected to, then
            // all sorts of trust issues can arise.
            (nodeName === "base" && attrNormalizedName === "href") ||
            // links can be stylesheets or imports, which can run script in the current origin
            (nodeName === "link" && attrNormalizedName === "href")
          ) {
            return $sce.RESOURCE_URL;
          }

          if (
            nodeName === "a" &&
            (attrNormalizedName === "href" || attrNormalizedName === "ngHref")
          ) {
            return $sce.URL;
          }

          return undefined;
        }

        /**
         * @param {string} nodeName
         * @param {string} propNormalizedName
         */
        function getTrustedPropContext(nodeName, propNormalizedName) {
          const prop = propNormalizedName.toLowerCase();

          return (
            PROP_CONTEXTS[`${nodeName}|${prop}`] || PROP_CONTEXTS[`*|${prop}`]
          );
        }

        /**
         * @param {unknown} value
         * @param {string} invokeType
         */
        function sanitizeSrcset(value, invokeType) {
          if (!value) {
            return value;
          }

          if (!isString(value)) {
            throw $compileMinErr(
              "srcset",
              'Can\'t pass trusted values to `{0}`: "{1}"',
              invokeType,
              /** @type {Object} */ (value).toString(),
            );
          }

          // Such values are a bit too complex to handle automatically inside $sce.
          // Instead, we sanitize each of the URIs individually, which works, even dynamically.
          // It's not possible to work around this using `$sce.trustAsMediaUrl`.
          // If you want to programmatically set explicitly trusted unsafe URLs, you should use
          // `$sce.trustAsHtml` on the whole `img` tag and inject it into the DOM using the
          // `ng-bind-html` directive.
          let result = "";

          // first check if there are spaces because it's not the same pattern
          const trimmedSrcset = trim(value);

          //                (   999x   ,|   999w   ,|   ,|,   )
          const srcPattern = /(\s+\d+x\s*,|\s+\d+w\s*,|\s+,|,\s+)/;

          const pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

          // split srcset into tuple of uri and descriptor except for the last item
          const rawUris = trimmedSrcset.split(pattern);

          // for each tuples
          const nbrUrisWith2parts = Math.floor(rawUris.length / 2);

          let i;

          for (i = 0; i < nbrUrisWith2parts; i++) {
            const innerIdx = i * 2;

            // sanitize the uri
            result += $sce.getTrustedMediaUrl(trim(rawUris[innerIdx]));
            // add the descriptor
            result += ` ${trim(rawUris[innerIdx + 1])}`;
          }

          // split the last item into uri and descriptor
          const lastTuple = trim(rawUris[i * 2]).split(/\s/);

          // sanitize the last uri
          result += $sce.getTrustedMediaUrl(trim(lastTuple[0]));

          // and add the last descriptor if any
          if (lastTuple.length === 2) {
            result += ` ${trim(lastTuple[1])}`;
          }

          return result;
        }

        /**
         * @param {Element} node
         * @param {ng.Directive<any>[] | { priority: number; compile: (_: any, attr: any) => { pre: (scope: any, $element: any) => void; }; }[]} directives
         * @param {string} attrName
         * @param {string} propName
         */
        function addPropertyDirective(node, directives, attrName, propName) {
          if (EVENT_HANDLER_ATTR_REGEXP.test(propName)) {
            throw $compileMinErr(
              "nodomevents",
              "Property bindings for HTML DOM event properties are disallowed",
            );
          }

          const nodeName = getNodeName(node);

          const trustedContext = getTrustedPropContext(nodeName, propName);

          let sanitizer = (/** @type {any} */ x) => x;

          // Sanitize img[srcset] + source[srcset] values.
          if (
            propName === "srcset" &&
            (nodeName === "img" || nodeName === "source")
          ) {
            sanitizer = (value) =>
              sanitizeSrcset($sce.valueOf(value), "ng-prop-srcset");
          } else if (trustedContext) {
            sanitizer = $sce.getTrusted.bind($sce, trustedContext);
          }

          directives.push({
            priority: 100,
            compile: function ngPropCompileFn(_, attr) {
              return /** @type {any} */ ({
                pre: propertyDirectivePreLinkFn,
                _preLinkCtx: {
                  _attrName: attrName,
                  _propName: propName,
                  _ngPropGetter: $parse(attr[attrName]),
                  _sanitizer: sanitizer,
                },
              });
            },
          });
        }

        /**
         * @param {Element} node
         * @param {ng.Directive<any>[]} directives
         * @param {string} value
         * @param {string} name
         * @param {boolean} isNgAttr
         */
        function addAttrInterpolateDirective(
          node,
          directives,
          value,
          name,
          isNgAttr,
        ) {
          const nodeName = getNodeName(node);

          const trustedContext = getTrustedAttrContext(nodeName, name);

          const mustHaveExpression = !isNgAttr;

          const allOrNothing = ALL_OR_NOTHING_ATTRS.includes(name) || isNgAttr;

          /** @type {import("../interpolate/interface.ts").InterpolationFunction | undefined} */
          const interpolateFn = /** @type {any} */ (
            $interpolate(
              value,
              mustHaveExpression,
              trustedContext,
              allOrNothing,
            )
          );

          // no interpolation found -> ignore
          if (!interpolateFn) {
            return;
          }

          if (name === "multiple" && nodeName === "select") {
            throw $compileMinErr(
              "selmulti",
              "Binding to the 'multiple' attribute is not supported. Element: {0}",
              startingTag(node.outerHTML),
            );
          }

          if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
            throw $compileMinErr(
              "nodomevents",
              "Interpolations for HTML DOM event attributes are disallowed",
            );
          }

          directives.push({
            priority: 100,
            compile() {
              return /** @type {any} */ ({
                pre: attrInterpolatePreLinkFn,
                _preLinkCtx: {
                  _name: name,
                  _value: value,
                  _trustedContext: trustedContext,
                  _allOrNothing: allOrNothing,
                  _interpolateFn: interpolateFn,
                },
              });
            },
          });
        }

        /**
         * @param {string} attrName
         * @param {string} directiveName
         */
        function strictBindingsCheck(attrName, directiveName) {
          if (strictComponentBindingsEnabled) {
            throw $compileMinErr(
              "missingattr",
              "Attribute '{0}' of '{1}' is non-optional and must be set!",
              attrName,
              directiveName,
            );
          }
        }

        // Set up $watches for isolate scope and controller bindings.
        /**
         *
         * @param {ng.Scope} scope
         * @param {*} attrs
         * @param {ng.Scope}  destination - child scope or isolate scope
         * @param {*} bindings
         * @param {*} directive
         * @returns
         */
        function initializeDirectiveBindings(
          scope,
          attrs,
          destination,
          bindings,
          directive,
        ) {
          /**
           * @type {((() => void) | undefined)[]}
           */
          const removeWatchCollection = [];

          /** @type {Record<string, import("./interface.ts").SimpleChange>} */
          const initialChanges = {};

          /** @type {Record<string, import("./interface.ts").SimpleChange> | undefined} */
          let changes;

          const attrsAny = /** @type {any} */ (attrs);

          const destAny = /** @type {any} */ (destination);

          if (bindings) {
            entries(bindings).forEach(([scopeName, definition]) => {
              const {
                attrName,
                optional,
                mode, // @, =, <, or &
              } = definition;

              /** @type {any} */
              let lastValue;

              /** @type {import("../parse/interface").CompiledExpression | undefined} */
              let parentGet;

              /** @type {(scope: any, value: any) => any} */
              let parentSet;

              /** @type {(a: any, b: any) => boolean} */
              let compare;

              let removeWatch;

              let firstCall = true;

              let firstChange = true;

              switch (mode) {
                case "@":
                  if (!optional && !hasOwn(attrs, attrName)) {
                    strictBindingsCheck(attrName, directive.name);
                    destAny[scopeName] = attrsAny[attrName] = undefined;
                  }

                  removeWatch = attrs.$observe(
                    attrName,
                    /** @param {any} value */ (value) => {
                      if (isString(value) || isBoolean(value)) {
                        recordChanges(scopeName, value, firstChange);

                        destAny[scopeName] = value;

                        if (firstCall) {
                          firstCall = false;
                        } else {
                          triggerOnChangesHook();
                          firstChange = false;
                        }
                      }
                    },
                  );
                  attrs._observers[attrName]._scope = scope;
                  lastValue = attrsAny[attrName];

                  if (isString(lastValue)) {
                    // If the attribute has been provided then we trigger an interpolation to ensure
                    // the value is there for use in the link fn
                    destAny[scopeName] =
                      /** @type {import("../interpolate/interface.ts").InterpolationFunction} */ (
                        $interpolate(lastValue)
                      )(scope);
                  } else if (isBoolean(lastValue)) {
                    // If the attributes is one of the BOOLEAN_ATTR then AngularTS will have converted
                    // the value to boolean rather than a string, so we special case this situation
                    destAny[scopeName] = lastValue;
                  }

                  /**
                   * @type {import("./interface.ts").SimpleChange}
                   */
                  initialChanges[scopeName] = {
                    currentValue: destAny[scopeName],
                    firstChange: true,
                  };
                  removeWatchCollection.push(removeWatch);
                  break;

                case "=": {
                  if (!hasOwn(attrs, attrName)) {
                    if (optional) {
                      break;
                    }
                    strictBindingsCheck(attrName, directive.name);
                    attrsAny[attrName] = undefined;
                  }

                  if (optional && !attrsAny[attrName]) {
                    break;
                  }

                  const attr = attrsAny[attrName];

                  parentGet = attr && $parse(attr);

                  if (parentGet && parentGet._literal) {
                    compare = equals;
                  } else {
                    compare = simpleCompare;
                  }

                  parentSet =
                    (parentGet && parentGet._assign) ||
                    function () {
                      // reset the change, or we will throw this exception on every $digest

                      throw $compileMinErr(
                        "nonassign",
                        "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
                        attrsAny[attrName],
                        attrName,
                        directive.name,
                      );
                    };
                  // store the value that the parent scope had after the last check:
                  lastValue = destAny.$target[scopeName] =
                    parentGet && parentGet(scope.$target);

                  const parentValueWatch = function parentValueWatch(
                    /** @type {any} */ parentValue,
                  ) {
                    if (!compare(parentValue, destAny[scopeName])) {
                      // we are out of sync and need to copy
                      if (!compare(parentValue, lastValue)) {
                        // parent changed and it has precedence
                        destAny[scopeName] = parentValue;
                      } else {
                        // if the parent can be assigned then do so
                        parentSet(scope, (parentValue = destAny[scopeName]));
                      }
                    }
                    lastValue = parentValue;

                    return lastValue;
                  };

                  if (attrsAny[attrName]) {
                    const expr = attrsAny[attrName];

                    const syncParentValue = $parse(expr, parentValueWatch);

                    // make it lazy as we dont want to trigger the two way data binding at this point
                    scope.$watch(
                      expr,
                      (val) => {
                        if (val) {
                          if (parentGet && parentGet._literal) {
                            scope.$target[attrName] = val;
                          } else {
                            scope[attrName] = val;
                          }
                          syncParentValue(scope);
                        } else {
                          scope[attrName] = scope[attrsAny[attrName]];
                        }
                      },
                      true,
                    );
                  }

                  removeWatch = destination.$watch(
                    attrName,
                    (val) => {
                      if (
                        val === lastValue &&
                        !isUndefined(attrsAny[attrName])
                      ) {
                        return;
                      }

                      if (
                        (parentGet &&
                          !!parentGet._inputs &&
                          !parentGet._literal) ||
                        (isUndefined(attrsAny[attrName]) && isDefined(val))
                      ) {
                        destination.$target[attrName] = lastValue;
                        throw $compileMinErr(
                          "nonassign",
                          "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
                          attrsAny[attrName],
                          attrName,
                          directive.name,
                        );
                      } else {
                        // manually set the handler to avoid watch cycles
                        if (isObject(val)) {
                          entries(val).forEach(([key, value]) => {
                            scope.$target[key] = value;
                          });
                        } else {
                          parentSet(scope.$target, (lastValue = val));
                          scope.$handler._watchers
                            .get(attrsAny[attrName])
                            ?.forEach((watchFn) => {
                              watchFn.listenerFn(val, scope.$target);
                            });
                        }
                      }
                    },
                    true,
                  );
                  removeWatchCollection.push(removeWatch);
                  break;
                }

                case "<":
                  if (!hasOwn(attrs, attrName)) {
                    if (optional) {
                      break;
                    }
                    strictBindingsCheck(attrName, directive.name);
                    attrsAny[attrName] = undefined;
                  }

                  if (optional && !attrsAny[attrName]) {
                    break;
                  }

                  parentGet = attrsAny[attrName] && $parse(attrsAny[attrName]);

                  destAny.$target[scopeName] =
                    parentGet && parentGet(scope.$target);
                  /** @type {import("./interface.ts").SimpleChange} */
                  initialChanges[scopeName] = {
                    currentValue: destAny.$target[scopeName],
                    firstChange,
                  };
                  scope.$target.attrs = attrs;

                  if (attrsAny[attrName]) {
                    removeWatch = scope.$watch(
                      attrsAny[attrName],
                      (val) => {
                        destAny.$target[scopeName] = val;
                        recordChanges(scopeName, val, firstChange);

                        if (firstChange) {
                          firstChange = false;
                        }
                      },
                      true,
                    );
                    removeWatchCollection.push(removeWatch);
                  }
                  break;

                case "&":
                  if (!optional && !hasOwn(attrs, attrName)) {
                    strictBindingsCheck(attrName, directive.name);
                  }
                  // Don't assign Object.prototype method to scope
                  parentGet = hasOwn(attrs, attrName)
                    ? $parse(attrsAny[attrName])
                    : undefined;

                  // Don't assign noop to destination if expression is not valid
                  if (!parentGet && optional) {
                    break;
                  }

                  destAny.$target[scopeName] = function (
                    /** @type {any} */ locals,
                  ) {
                    return parentGet && parentGet(scope.$target, locals);
                  };

                  break;
              }
            });
          }

          /**
           * @param {string} key
           * @param {any} currentValue
           * @param {boolean} initial
           */
          function recordChanges(key, currentValue, initial) {
            if (isFunction(destination.$onChanges)) {
              // If we have not already scheduled the top level onChangesQueue handler then do so now
              if (!onChangesQueue.length) {
                scope.$postUpdate(flushOnChangesQueue);
                onChangesQueue.length = 0;
              }

              // If we have not already queued a trigger of onChanges for this controller then do so now
              if (!changes) {
                changes = {};
                onChangesQueue.push(triggerOnChangesHook);
              }
              // Store this change
              changes[key] = {
                currentValue,
                firstChange: initial,
              };
            }
          }

          function triggerOnChangesHook() {
            destination.$onChanges &&
              changes &&
              destination.$onChanges(changes);
            // Now clear the changes so that we schedule onChanges when more changes arrive
            changes = undefined;
          }

          return {
            initialChanges,
            removeWatches:
              removeWatchCollection.length &&
              function removeWatches() {
                for (
                  let i = 0, ii = removeWatchCollection.length;
                  i < ii;
                  ++i
                ) {
                  /** @type {Function} */ (removeWatchCollection[i])();
                }
              },
          };
        }
      },
    ];
  }
}

/**
 * @param {String} name
 * @returns {void}
 */
function assertValidDirectiveName(name) {
  const letter = name.charAt(0);

  if (!letter || letter !== letter.toLowerCase()) {
    throw $compileMinErr(
      "baddir",
      "Directive/Component name '{0}' is invalid. The first character must be a lowercase letter",
      name,
    );
  }

  if (name !== name.trim()) {
    throw $compileMinErr(
      "baddir",
      "Directive/Component name '{0}' is invalid. The name should not contain leading or trailing whitespaces",
      name,
    );
  }
}

/**
 * Normalizes the `require` declaration for a directive.
 * Object-form requires inherit their own key when the value omits the directive name
 * (e.g. `{ foo: "^^" }` becomes `{ foo: "^^foo" }`).
 *
 * @param {ng.Directive} directive
 * @returns {string | Array<any> | Record<string, string> | undefined}
 */
export function getDirectiveRequire(directive) {
  const require = directive.require || (directive.controller && directive.name);

  if (!isArray(require) && isObject(require)) {
    const entryList = entries(require);

    for (let i = 0, len = entryList.length; i < len; i++) {
      const [key, value] = entryList[i];

      const match = value.match(REQUIRE_PREFIX_REGEXP);

      if (!match) continue;

      const name = value.substring(match[0].length);

      if (!name) {
        require[key] = match[0] + key;
      }
    }
  }

  return require;
}

/**
 * Validates and normalizes a directive `restrict` value.
 *
 * @param {unknown} restrict
 * @param {string} name
 * @returns {string}
 */
export function getDirectiveRestrict(restrict, name) {
  if (restrict && !(isString(restrict) && /[EA]/.test(restrict))) {
    throw $compileMinErr(
      "badrestrict",
      "Restrict property '{0}' of directive '{1}' is invalid",
      restrict,
      name,
    );
  }

  return isString(restrict) ? restrict : "EA";
}

/**
 * Detects the namespace used when compiling child nodes beneath a parent element.
 * This is primarily used to decide whether template wrapping should happen in HTML or SVG mode.
 *
 * @param {Element | Node | null | undefined} parentElement
 * @returns {"html" | "svg"}
 */
export function detectNamespaceForChildElements(parentElement) {
  const node = parentElement;

  if (!node) {
    return "html";
  }

  return getNodeName(/** @type {Element} */ (node)) !== "foreignobject" &&
    toString.call(node).match(/SVG/)
    ? "svg"
    : "html";
}

/**
 * Builds a stable node array for linking so index-based mappings stay valid even if DOM shape changes.
 *
 * @param {CompositeLinkState} state
 * @param {NodeRef} nodeRef
 * @returns {Node[]}
 */
export function buildStableNodeList(state, nodeRef) {
  /** @type {Node[]} */
  let stableNodeList = [];

  if (state._nodeLinkFnFound) {
    const stableLength = nodeRef._isList ? nodeRef.nodes.length : 1;

    stableNodeList = new Array(stableLength);

    for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
      const { _index: idx } = state._linkFnsList[i];

      if (idx === 0) {
        stableNodeList[idx] = nodeRef._isList
          ? nodeRef.nodes[idx]
          : nodeRef.node;
      } else if (state._nodeRefList?._getIndex(idx)) {
        stableNodeList[idx] = nodeRef.nodes[idx];
      }
    }
  } else if (nodeRef._isList) {
    for (let i = 0, l = nodeRef.nodes.length; i < l; i++) {
      stableNodeList.push(nodeRef.nodes[i]);
    }
  } else {
    stableNodeList.push(nodeRef.node);
  }

  return stableNodeList;
}

/**
 * Serializes one or more interpolation inputs into the watch expression used by `$watch`.
 * Single expressions stay unchanged; multi-input interpolations are packed into an array expression.
 *
 * @param {string[]} expressions
 * @returns {string}
 */
export function buildInterpolationWatchExpression(expressions) {
  return expressions.length === 1
    ? expressions[0]
    : `[${expressions.join(",")}]`;
}

/**
 * Writes the interpolated text result to either an element node or a text node.
 *
 * @param {Node} node
 * @param {string} value
 * @returns {void}
 */
export function applyTextInterpolationValue(node, value) {
  switch (node.nodeType) {
    case 1:
      /** @type {Element} */ (node).innerHTML = value;
      break;
    default:
      node.nodeValue = value;
  }
}

/**
 * Sorts directives by priority, then name, then registration index.
 * This matches the compiler's directive application order.
 *
 * @param {InternalDirective} a
 * @param {InternalDirective} b
 * @returns {number}
 */
export function byPriority(a, b) {
  const diff =
    /** @type {number} */ (b.priority) - /** @type {number} */ (a.priority);

  if (diff !== 0) {
    return diff;
  }

  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1;
  }

  return /** @type {number} */ (a.index) - /** @type {number} */ (b.index);
}

/**
 * Wraps non-HTML templates in a temporary namespace container so the browser parses SVG/MathML correctly.
 *
 * @param {string | undefined} type
 * @param {string} template
 * @returns {string | NodeListOf<ChildNode>}
 */
export function wrapTemplate(type, template) {
  type = (type || "html").toLowerCase();

  switch (type) {
    case "svg":
    case "math": {
      const wrapper = /** @type {HTMLDivElement} */ (
        document.createElement("div")
      );

      wrapper.innerHTML = `<${type}>${template}</${type}>`;

      return wrapper.childNodes[0].childNodes;
    }
    default:
      return template;
  }
}

/**
 * Replaces the node currently represented by `elementsToRemove` while preserving the removed nodes
 * in a fragment so traversal and later queries continue to work during compilation.
 *
 * @param {NodeRef} elementsToRemove
 * @param {Node} newNode
 * @param {number} [index]
 * @returns {void}
 */
export function replaceWith(elementsToRemove, newNode, index) {
  const firstElementToRemove = elementsToRemove._getAny();

  const parent = firstElementToRemove.parentNode;

  if (parent) {
    if (isDefined(index)) {
      const oldChild = parent.childNodes[index];

      if (oldChild) {
        parent.replaceChild(newNode, oldChild);
      }
    } else {
      parent.insertBefore(newNode, parent.firstChild);
    }
  }

  const fragment = document.createDocumentFragment();

  elementsToRemove._collection().forEach((element) => {
    fragment.appendChild(element);
  });

  elementsToRemove.node = newNode;
}
