import { _injector, _interpolate, _exceptionHandler, _templateRequest, _parse, _controller, _sce, _scope, _provide } from '../../injection-tokens.js';
import { getBooleanAttrName, createDocumentFragment, emptyElement, isTextNode, createNodelistFromHTML, startingTag, createElementFromHTML, setScope, setCacheData, deleteCacheData, setIsolateScope, getInheritedData, getCacheData } from '../../shared/dom.js';
import { NodeType } from '../../shared/node.js';
import { NodeRef } from '../../shared/noderef.js';
import { identifierForController } from '../controller/controller.js';
import { createScope } from '../scope/scope.js';
import { isDefined, assign, getNodeName, directiveNormalize, hasOwn, isObject, nullObject, isFunction, trim, isString, arrayFrom, inherit, isInstanceOf, isArray, entries, assertArg, assertNotHasOwnProperty, stringify, deProxy, isError, keys, isUndefined, minErr, extend, isBoolean, isScope, equals, simpleCompare } from '../../shared/utils.js';
import { SCE_CONTEXTS } from '../../services/sce/context.js';
import { PREFIX_REGEXP } from '../../shared/constants.js';
import { createEventDirective, createWindowEventDirective } from '../../directive/events/events.js';
import { Attributes } from './attributes.js';
import { ngObserveDirective } from '../../directive/observe/observe.js';

const scopeOwnedNodeRefs = new WeakMap();
function registerScopeOwnedNodeRef(scope, nodeRef) {
    if (!scope || !isFunction(scope.$on)) {
        return;
    }
    let ownedNodeRefs = scopeOwnedNodeRefs.get(scope);
    if (!ownedNodeRefs) {
        ownedNodeRefs = new Set();
        scopeOwnedNodeRefs.set(scope, ownedNodeRefs);
        scope.$on("$destroy", () => {
            const refs = scopeOwnedNodeRefs.get(scope);
            if (!refs) {
                return;
            }
            refs.forEach((ref) => ref._release());
            refs.clear();
            scopeOwnedNodeRefs.delete(scope);
        });
    }
    ownedNodeRefs.add(nodeRef);
}
function releaseControllersBoundTranscludeState(transcludeState) {
    if (transcludeState._destroyed) {
        return;
    }
    transcludeState._destroyed = true;
    if (transcludeState._wrapper) {
        transcludeState._wrapper._boundTransclude = undefined;
        transcludeState._wrapper = undefined;
    }
    transcludeState._boundTranscludeFn = undefined;
    transcludeState._elementControllers = nullObject();
    transcludeState._scopeToChild = undefined;
    transcludeState._elementRef = undefined;
}
function syncControllersBoundTranscludeState(transcludeState, scopeToChild, elementControllers, elementRef) {
    transcludeState._scopeToChild = scopeToChild;
    transcludeState._elementControllers = elementControllers;
    transcludeState._elementRef = elementRef;
}
const $compileMinErr = minErr("$compile");
const EXCLUDED_DIRECTIVES = ["ngIf", "ngRepeat"];
const ALL_OR_NOTHING_ATTRS = ["ngSrc", "ngSrcset", "src", "srcset"];
const REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;
const NG_PREFIX_BINDING = /^ng(Attr|Prop|On|Observe|Window)([A-Z].*)$/;
// Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
// The assumption is that future DOM event attribute names will begin with
// 'on' and be composed of only English letters.
const EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;
const valueFn = (value) => () => value;
const DirectiveSuffix = "Directive";
class CompileProvider {
    /** Configures directive registration and compile-time provider behavior. */
    constructor($provide) {
        const provider = this;
        const hasDirectives = {};
        const bindingCache = nullObject();
        const directiveLookupCache = nullObject();
        /** Parses isolate-scope or controller binding definitions for a directive. */
        function parseIsolateBindings(scope, directiveName, isController) {
            const LOCAL_REGEXP = /^([@&]|[=<]())(\??)\s*([\w$]*)$/;
            const bindings = nullObject();
            const scopeNames = keys(scope);
            for (let i = 0, l = scopeNames.length; i < l; i++) {
                const scopeName = scopeNames[i];
                let definition = scope[scopeName];
                definition = definition.trim();
                if (definition in bindingCache) {
                    bindings[scopeName] = bindingCache[definition];
                    continue;
                }
                const match = definition.match(LOCAL_REGEXP);
                if (!match) {
                    throw $compileMinErr("iscp", "Invalid {3} for directive '{0}'." +
                        " Definition: {... {1}: '{2}' ...}", directiveName, scopeName, definition, isController
                        ? "controller bindings definition"
                        : "isolate scope definition");
                }
                bindings[scopeName] = {
                    _mode: match[1][0],
                    _collection: match[2] === "*",
                    _optional: match[3] === "?",
                    _attrName: match[4] || scopeName,
                };
                if (match[4]) {
                    bindingCache[definition] = bindings[scopeName];
                }
            }
            return bindings;
        }
        /** Collects the parsed scope and controller binding configuration for a directive. */
        function parseDirectiveBindings(directive, directiveName) {
            const bindings = {
                _isolateScope: null,
                _bindToController: null,
            };
            if (isObject(directive.scope)) {
                if (directive.bindToController === true) {
                    bindings._bindToController = parseIsolateBindings(directive.scope, directiveName, true);
                    bindings._isolateScope = {};
                }
                else {
                    bindings._isolateScope = parseIsolateBindings(directive.scope, directiveName, false);
                }
            }
            if (isObject(directive.bindToController)) {
                bindings._bindToController = parseIsolateBindings(directive.bindToController, directiveName, true);
            }
            if (bindings._bindToController && !directive.controller) {
                // There is no controller
                throw $compileMinErr("noctrl", "Cannot bind to controller without directive '{0}'s controller.", directiveName);
            }
            return bindings;
        }
        /**
         * Register a new directive with the compiler.
         *
         * @param name - Name of the directive in camel-case (i.e. `ngBind` which will match
         *    as `ng-bind`), or an object map of directives where the keys are the names and the values
         *    are the factories.
         * @param directiveFactory - An injectable directive factory function. See the
         *    {@link guide/directive directive guide} and the {@link $compile compile API} for more info.
         * @returns Self for chaining.
         */
        const registerDirective = function registerDirective(name, directiveFactory) {
            assertArg(name, "name");
            if (isString(name)) {
                assertNotHasOwnProperty(name, "directive");
                assertValidDirectiveName(name);
                assertArg(directiveFactory, "directiveFactory");
                const normalizedDirectiveFactory = directiveFactory;
                if (!hasOwn(hasDirectives, name)) {
                    hasDirectives[name] = [];
                    $provide.factory(name + DirectiveSuffix, [
                        _injector,
                        _exceptionHandler,
                        /** Instantiates and normalizes the registered directive factories for one name. */
                        function ($injector, $exceptionHandler) {
                            const directives = [];
                            for (let i = 0, l = hasDirectives[name].length; i < l; i++) {
                                const directiveFactoryInstance = hasDirectives[name][i];
                                try {
                                    let directive = $injector.invoke(directiveFactoryInstance);
                                    if (isFunction(directive)) {
                                        directive = {
                                            compile: valueFn(directive),
                                        };
                                    }
                                    else if (!directive.compile && directive.link) {
                                        directive.compile = valueFn(directive.link);
                                    }
                                    const normalizedDirective = directive;
                                    normalizedDirective.priority =
                                        normalizedDirective.priority || 0;
                                    normalizedDirective.index = i;
                                    normalizedDirective.name = normalizedDirective.name || name;
                                    normalizedDirective.require =
                                        getDirectiveRequire(normalizedDirective);
                                    normalizedDirective.restrict = getDirectiveRestrict(normalizedDirective.restrict, name);
                                    directives.push(normalizedDirective);
                                }
                                catch (err) {
                                    $exceptionHandler(err);
                                }
                            }
                            return directives;
                        },
                    ]);
                }
                hasDirectives[name].push(normalizedDirectiveFactory);
                delete directiveLookupCache[name];
            }
            else {
                entries(name).forEach(([k, v]) => provider.directive(k, v));
            }
            return provider;
        };
        this.directive = registerDirective;
        /**
         * @param name - Name of the component in camelCase (i.e. `myComp` which will match `<my-comp>`),
         *    or an object map of components where the keys are the names and the values are the component definition objects.
         * @param options - Component definition object (a simplified
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
         * @returns The compile provider itself, for chaining of function calls.
         */
        const registerComponent = function registerComponent(name, options) {
            if (!isString(name)) {
                entries(name).forEach(([key, val]) => provider.component(key, val));
                return provider;
            }
            const componentOptions = options;
            const controller = componentOptions.controller ||
                function () {
                    /* empty */
                };
            /** Creates the component-backed directive definition factory. */
            function factory($injector) {
                /** Wraps injectable component options so `$element` and `$attrs` are available. */
                const makeInjectable = (fn) => {
                    if (isFunction(fn) || isArray(fn)) {
                        return (tElement, tAttrs) => {
                            return $injector.invoke(fn, null, {
                                $element: tElement,
                                $attrs: tAttrs,
                            });
                        };
                    }
                    return fn;
                };
                const template = !componentOptions.template && !componentOptions.templateUrl
                    ? ""
                    : componentOptions.template;
                const ddo = {
                    controller,
                    controllerAs: identifierForController(componentOptions.controller) ||
                        componentOptions.controllerAs ||
                        "$ctrl",
                    template: makeInjectable(template),
                    templateUrl: makeInjectable(componentOptions.templateUrl),
                    transclude: componentOptions.transclude,
                    scope: {},
                    bindToController: componentOptions.bindings || {},
                    restrict: "E",
                    require: componentOptions.require,
                };
                // Copy annotations (starting with $) over to the DDO
                entries(componentOptions).forEach(([key, val]) => {
                    if (key.charAt(0) === "$") {
                        ddo[key] = val;
                    }
                });
                return ddo;
            }
            // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
            // These could be used by libraries such as the new component router
            entries(componentOptions).forEach(([key, val]) => {
                if (key.charAt(0) === "$") {
                    factory[key] = val;
                    // Don't try to copy over annotations to named controller
                    if (isFunction(controller)) {
                        controller[key] = val;
                    }
                }
            });
            factory.$inject = [_injector];
            return provider.directive(name, factory);
        };
        this.component = registerComponent;
        /**
         * @param enabled - Update the strictComponentBindingsEnabled state if provided,
         * otherwise return the current strictComponentBindingsEnabled state.
         * @returns Current value if used as getter or itself (chaining) if used as setter.
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
            /** @param enabled */
            function (enabled) {
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
        const LEGACY_SCE_CONTEXTS = {
            html: SCE_CONTEXTS._HTML,
            mediaUrl: SCE_CONTEXTS._MEDIA_URL,
            resourceUrl: SCE_CONTEXTS._RESOURCE_URL,
            url: SCE_CONTEXTS._URL,
        };
        /**
         * Defines the security context for DOM properties bound by ng-prop-*.
         *
         * @param elementName - The element name or '*' to match any element.
         * @param propertyName - The DOM property name.
         * @param ctx - The {@link _sce} security context in which this value is safe for use, e.g. `$sce.URL`
         * @returns `this` for chaining.
         */
        this.addPropertySecurityContext = function (elementName, propertyName, ctx) {
            const normalizedCtx = LEGACY_SCE_CONTEXTS[ctx] || ctx;
            const key = `${elementName.toLowerCase()}|${propertyName.toLowerCase()}`;
            if (key in PROP_CONTEXTS && PROP_CONTEXTS[key] !== normalizedCtx) {
                throw $compileMinErr("ctxoverride", "Property context '{0}.{1}' already set to '{2}', cannot override to '{3}'.", elementName, propertyName, PROP_CONTEXTS[key], normalizedCtx);
            }
            PROP_CONTEXTS[key] = normalizedCtx;
            return this;
        };
        /* Default property contexts.
         *
         * Copy of https://github.com/angular/angular/blob/6.0.6/packages/compiler/src/schema/dom_security_schema.ts#L31-L58
         * Changing:
         * - SecurityContext.* => SCE_CONTEXTS/$sce.*
         * - various URL => MEDIA_URL
         * - *|formAction, form|action URL => RESOURCE_URL (like the attribute)
         */
        (function registerNativePropertyContexts() {
            /** Registers the same security context for a list of `element|property` keys. */
            function registerContext(ctx, items) {
                items.forEach((v) => {
                    PROP_CONTEXTS[v.toLowerCase()] = ctx;
                });
            }
            registerContext(SCE_CONTEXTS._HTML, [
                "iframe|srcdoc",
                "*|innerHTML",
                "*|outerHTML",
            ]);
            registerContext(SCE_CONTEXTS._URL, [
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
            registerContext(SCE_CONTEXTS._MEDIA_URL, [
                "audio|src",
                "img|src",
                "img|srcset",
                "source|src",
                "source|srcset",
                "track|src",
                "video|src",
                "video|poster",
            ]);
            registerContext(SCE_CONTEXTS._RESOURCE_URL, [
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
            _injector,
            _interpolate,
            _exceptionHandler,
            _templateRequest,
            _parse,
            _controller,
            _sce,
            /** Creates the runtime `$compile` service and its shared helper closures. */
            ($injector, $interpolate, $exceptionHandler, $templateRequest, $parse, $controller, $sce) => {
                const onChangesQueueState = {
                    _exceptionHandler: $exceptionHandler,
                    _queue: [],
                    _flush: undefined,
                };
                // This function is called in a $postUpdate to trigger all the onChanges hooks in a single digest
                onChangesQueueState._flush = () => flushDirectiveBindingOnChangesQueue(onChangesQueueState);
                const startSymbol = $interpolate.startSymbol();
                const endSymbol = $interpolate.endSymbol();
                const denormalizeTemplate = startSymbol === "{{" && endSymbol === "}}"
                    ? (x) => x
                    : (x) => x.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);
                function triggerDirectiveBindingOnChanges(state) {
                    state._destAny.$onChanges &&
                        state._changes &&
                        state._destAny.$onChanges(state._changes);
                    state._changes = undefined;
                }
                /** Flushes queued `$onChanges` hooks in one post-update turn. */
                function flushDirectiveBindingOnChangesQueue(queueState) {
                    const queue = queueState._queue;
                    for (let i = 0, ii = queue.length; i < ii; ++i) {
                        try {
                            triggerDirectiveBindingOnChanges(queue[i]);
                        }
                        catch (err) {
                            queueState._exceptionHandler(err);
                        }
                    }
                    queue.length = 0;
                }
                function recordDirectiveBindingChange(state, key, currentValue, initial) {
                    if (!isFunction(state._destAny.$onChanges)) {
                        return;
                    }
                    if (!state._onChangesQueue._queue.length) {
                        state._scope.$postUpdate(state._onChangesQueue._flush);
                        state._onChangesQueue._queue.length = 0;
                    }
                    if (!state._changes) {
                        state._changes = {};
                        state._onChangesQueue._queue.push(state);
                    }
                    state._changes[key] = {
                        currentValue,
                        firstChange: initial,
                    };
                }
                function removeDirectiveBindingWatches(removeWatchCollection) {
                    for (let i = 0, ii = removeWatchCollection.length; i < ii; ++i) {
                        removeWatchCollection[i]?.();
                    }
                }
                function throwNonassignBindingError(state) {
                    throw $compileMinErr("nonassign", "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!", state._attrsAny[state._attrName], state._attrName, state._directiveName);
                }
                function syncTwoWayParentValue(state, parentValue) {
                    const destValue = state._destAny[state._scopeName];
                    if (!state._compare(parentValue, destValue)) {
                        if (!state._compare(parentValue, state._lastValue)) {
                            state._destAny[state._scopeName] = parentValue;
                        }
                        else {
                            state._parentSet(state._scope, (parentValue = state._destAny[state._scopeName]));
                        }
                    }
                    state._lastValue = parentValue;
                    return state._lastValue;
                }
                function handleTwoWayExpressionChange(state, syncParentValue, val) {
                    if (val) {
                        if (state._parentGet && state._parentGet._literal) {
                            state._scopeTarget[state._attrName] = val;
                        }
                        else {
                            state._scope[state._attrName] = val;
                        }
                        syncParentValue(state._scope);
                    }
                    else {
                        state._scope[state._attrName] = state._scope[state._attrsAny[state._attrName]];
                    }
                }
                function handleTwoWayDestinationChange(state, val) {
                    if (val === state._lastValue &&
                        !isUndefined(state._attrsAny[state._attrName])) {
                        return;
                    }
                    if ((state._parentGet &&
                        !!state._parentGet._inputs &&
                        !state._parentGet._literal) ||
                        (isUndefined(state._attrsAny[state._attrName]) && isDefined(val))) {
                        state._destinationTarget[state._scopeName] = state._lastValue;
                        throwNonassignBindingError(state);
                    }
                    if (isObject(val)) {
                        const valueKeys = keys(val);
                        for (let i = 0, l = valueKeys.length; i < l; i++) {
                            const key = valueKeys[i];
                            state._scopeTarget[key] = val[key];
                        }
                        return;
                    }
                    state._parentSet(state._scopeTarget, (state._lastValue = val));
                    const attributeWatchers = state._scope.$handler._watchers.get(state._attrsAny[state._attrName]);
                    if (attributeWatchers) {
                        for (let i = 0, l = attributeWatchers.length; i < l; i++) {
                            attributeWatchers[i]._listenerFn(val, state._scope.$target);
                        }
                    }
                }
                function handleStringBindingObserve(state, value) {
                    if (!isString(value) && !isBoolean(value)) {
                        return;
                    }
                    recordDirectiveBindingChange(state._bindingChangeState, state._scopeName, value, state._firstChange);
                    state._destAny[state._scopeName] = value;
                    if (state._firstCall) {
                        state._firstCall = false;
                        return;
                    }
                    triggerDirectiveBindingOnChanges(state._bindingChangeState);
                    state._firstChange = false;
                }
                function handleOneWayBindingChange(state, val) {
                    state._destAny.$target[state._scopeName] = val;
                    recordDirectiveBindingChange(state._bindingChangeState, state._scopeName, val, state._firstChange);
                    if (state._firstChange) {
                        state._firstChange = false;
                    }
                }
                function invokePublicLink(state, scope, cloneConnectFn, options) {
                    const { _nodeRef: nodeRef } = state;
                    if (!nodeRef) {
                        throw $compileMinErr("multilink", "This element has already been linked.");
                    }
                    if (state._previousCompileContext?._needsNewScope) {
                        // A parent directive did a replace and a directive on this element asked
                        // for transclusion, which caused us to lose a layer of element on which
                        // we could hold the new transclusion scope, so we will create it manually
                        // here.
                        scope = scope.$parent?.$new() || scope.$new();
                    }
                    options = options || {};
                    let { _parentBoundTranscludeFn } = options;
                    const { _transcludeControllers, _futureParentElement } = options;
                    if (_parentBoundTranscludeFn &&
                        _parentBoundTranscludeFn._boundTransclude) {
                        _parentBoundTranscludeFn =
                            _parentBoundTranscludeFn._boundTransclude;
                    }
                    if (!state._namespace) {
                        state._namespace =
                            detectNamespaceForChildElements(_futureParentElement);
                    }
                    let $linkNode;
                    if (state._namespace !== "html") {
                        const fragment = createElementFromHTML("<div></div>");
                        fragment.append(nodeRef.node);
                        const wrappedTemplate = wrapTemplate(state._namespace, fragment.innerHTML);
                        $linkNode = new NodeRef(wrappedTemplate[0]);
                    }
                    else if (cloneConnectFn) {
                        $linkNode = nodeRef._clone();
                    }
                    else {
                        $linkNode = nodeRef;
                    }
                    if ($linkNode._element) {
                        setScope($linkNode._element, scope);
                    }
                    if (cloneConnectFn) {
                        registerScopeOwnedNodeRef(scope, $linkNode);
                    }
                    if (_transcludeControllers) {
                        const controllers = _transcludeControllers;
                        for (const controllerName in controllers) {
                            const linkElement = $linkNode._element;
                            setCacheData(linkElement, `$${controllerName}Controller`, controllers[controllerName]._instance);
                        }
                    }
                    if (cloneConnectFn) {
                        cloneConnectFn($linkNode.dom, scope);
                    }
                    if (state._compositeLinkFn) {
                        state._compositeLinkFn(scope, $linkNode, _parentBoundTranscludeFn);
                    }
                    if (!cloneConnectFn) {
                        state._nodeRef = null;
                        state._compositeLinkFn = null;
                    }
                    return $linkNode._getAll();
                }
                function invokeCompositeLink(state, scope, nodeRef, _parentBoundTranscludeFn) {
                    const stableNodeList = buildStableNodeList(state, nodeRef);
                    linkCompositeNodes(state, stableNodeList, scope, _parentBoundTranscludeFn || null);
                }
                function invokeBoundTransclude(state, transcludedScope, cloneFn, controllers, _futureParentElement, containingScope) {
                    if (!transcludedScope) {
                        transcludedScope = state._scope.$transcluded(containingScope);
                    }
                    return state._transcludeFn(transcludedScope, cloneFn, {
                        _parentBoundTranscludeFn: state._previousBoundTranscludeFn,
                        _transcludeControllers: controllers,
                        _futureParentElement,
                    });
                }
                return compile;
                function compile(element, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
                    const publicLinkState = {
                        _nodeRef: element ? new NodeRef(element) : null,
                        _compositeLinkFn: null,
                        _namespace: null,
                        _previousCompileContext: previousCompileContext || null,
                    };
                    publicLinkState._compositeLinkFn = compileNodes(publicLinkState._nodeRef, transcludeFn || undefined, maxPriority, ignoreDirective, previousCompileContext);
                    const publicLinkFn = function publicLinkFn(scope, cloneConnectFn, options) {
                        return invokePublicLink(publicLinkFn
                            ._state, scope, cloneConnectFn, options);
                    };
                    publicLinkFn._state = publicLinkState;
                    return publicLinkFn;
                }
                /**
                 * Runs node-level and child-level link functions for one compiled node list using precomputed mapping state.
                 */
                function linkCompositeNodes(state, stableNodeList, scope, _parentBoundTranscludeFn) {
                    for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
                        const { _index, _nodeLinkFnCtx, _childLinkFn } = state._linkFnsList[i];
                        const node = stableNodeList[_index];
                        let childScope;
                        let childBoundTranscludeFn;
                        if (_nodeLinkFnCtx?._nodeLinkFn) {
                            childScope = _nodeLinkFnCtx._newScope ? scope.$new() : scope;
                            if (_nodeLinkFnCtx._transcludeOnThisElement) {
                                childBoundTranscludeFn = createBoundTranscludeFn(scope, _nodeLinkFnCtx._transclude, _parentBoundTranscludeFn || null);
                            }
                            else if (!_nodeLinkFnCtx._templateOnThisElement &&
                                _parentBoundTranscludeFn) {
                                childBoundTranscludeFn = _parentBoundTranscludeFn;
                            }
                            else if (!_parentBoundTranscludeFn && state._transcludeFn) {
                                childBoundTranscludeFn = createBoundTranscludeFn(scope, state._transcludeFn, null);
                            }
                            else {
                                childBoundTranscludeFn = null;
                            }
                            if (_nodeLinkFnCtx?._newScope &&
                                node.nodeType === NodeType._ELEMENT_NODE) {
                                setScope(node, childScope);
                            }
                            if (isDefined(_nodeLinkFnCtx._nodeLinkFnState)) {
                                _nodeLinkFnCtx._nodeLinkFn(_nodeLinkFnCtx._nodeLinkFnState, _childLinkFn, childScope, node, childBoundTranscludeFn);
                            }
                            else {
                                _nodeLinkFnCtx._nodeLinkFn(_childLinkFn, childScope, node, childBoundTranscludeFn);
                            }
                        }
                        else if (_childLinkFn) {
                            _childLinkFn(scope, node.childNodes, _parentBoundTranscludeFn);
                        }
                    }
                }
                function isNodeRef(value) {
                    return isInstanceOf(value, NodeRef);
                }
                function getCompileNodeListSize(nodes) {
                    return isNodeRef(nodes) ? nodes.size : nodes.length;
                }
                function getCompileNodeAt(nodes, index) {
                    return isNodeRef(nodes) ? nodes._getIndex(index) : nodes[index];
                }
                function ensureCompileNodeRef(nodes) {
                    return isNodeRef(nodes) ? nodes : new NodeRef(nodes);
                }
                /**
                 * Compiles a `NodeRef` into a composite linking function.
                 *
                 * Walks each node, applies directives, recursively compiles children when needed,
                 * and returns a stable composite linker for the whole node list.
                 */
                function compileNodes(nodeRefList, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
                    if (!nodeRefList)
                        return null;
                    const linkFnsList = []; // An array to hold node indices and their linkFns
                    let nodeRefListContext = isNodeRef(nodeRefList) ? nodeRefList : null;
                    let nodeLinkFnFound;
                    let linkFnFound = false;
                    for (let i = 0, l = getCompileNodeListSize(nodeRefList); i < l; i++) {
                        const compileNode = getCompileNodeAt(nodeRefList, i);
                        const attrs = new Attributes($injector, $exceptionHandler, $sce);
                        const directives = collectDirectives(compileNode, attrs, i === 0 ? maxPriority : undefined, ignoreDirective);
                        let nodeLinkFnCtx;
                        if (directives.length) {
                            nodeRefListContext =
                                nodeRefListContext || ensureCompileNodeRef(nodeRefList);
                            nodeLinkFnCtx = applyDirectivesToNode(directives, compileNode, attrs, transcludeFn, null, [], [], assign({}, previousCompileContext, {
                                _index: i,
                                _parentNodeRef: nodeRefListContext,
                                _ctxNodeRef: nodeRefListContext,
                            }));
                        }
                        let childLinkFn;
                        const nodeLinkFn = nodeLinkFnCtx?._nodeLinkFn;
                        const childParentNode = nodeRefListContext
                            ? nodeRefListContext._getIndex(i)
                            : compileNode;
                        const { childNodes } = childParentNode;
                        if ((nodeLinkFn && nodeLinkFnCtx?._terminal) ||
                            !childNodes ||
                            !childNodes.length) {
                            childLinkFn = null;
                        }
                        else {
                            const transcluded = nodeLinkFn
                                ? nodeLinkFnCtx?._transcludeOnThisElement ||
                                    !nodeLinkFnCtx?._templateOnThisElement
                                    ? nodeLinkFnCtx?._transclude
                                    : undefined
                                : transcludeFn;
                            childLinkFn = compileNodes(childNodes, transcluded || undefined, undefined, undefined, undefined);
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
                    const compositeLinkState = {
                        _linkFnsList: linkFnsList,
                        _nodeRefList: nodeRefListContext,
                        _nodeLinkFnFound: nodeLinkFnFound,
                        _transcludeFn: transcludeFn,
                    };
                    const compositeLinkFn = function compositeLinkFn(scope, nodeRef, _parentBoundTranscludeFn) {
                        invokeCompositeLink(compositeLinkFn._state, scope, nodeRef, _parentBoundTranscludeFn);
                    };
                    compositeLinkFn._state = compositeLinkState;
                    return compositeLinkFn;
                }
                /**
                 * Prebinds a transclusion function to a parent scope and threads parent-bound transclusion context.
                 */
                function createBoundTranscludeFn(scope, transcludeFn, previousBoundTranscludeFn = null) {
                    const boundTranscludeState = {
                        _scope: scope,
                        _transcludeFn: transcludeFn,
                        _previousBoundTranscludeFn: previousBoundTranscludeFn,
                    };
                    const boundTranscludeFn = function boundTranscludeFn(transcludedScope, cloneFn, controllers, _futureParentElement, containingScope) {
                        return invokeBoundTransclude(boundTranscludeFn._state, transcludedScope, cloneFn, controllers, _futureParentElement, containingScope);
                    };
                    boundTranscludeFn._state = boundTranscludeState;
                    // We need  to attach the transclusion slots onto the `boundTranscludeFn`
                    // so that they are available inside the `controllersBoundTransclude` function
                    const boundSlots = (boundTranscludeFn._slots = nullObject());
                    for (const slotName in transcludeFn._slots) {
                        if (transcludeFn._slots[slotName]) {
                            boundSlots[slotName] = createBoundTranscludeFn(scope, transcludeFn._slots[slotName], previousBoundTranscludeFn);
                        }
                        else {
                            boundSlots[slotName] = null;
                        }
                    }
                    return boundTranscludeFn;
                }
                /**
                 * Looks for directives on the given node and adds them to the directive collection which is
                 * sorted.
                 *
                 * @param node - Node to search.
                 * @param attrs - The shared attrs object which is used to populate the normalized attributes.
                 * @param maxPriority - Max directive priority.
                 * @returns An array to which the directives are added. This array is sorted before the function returns.
                 */
                function collectDirectives(node, attrs, maxPriority, ignoreDirective) {
                    const directives = [];
                    const { nodeType } = node;
                    const attrsMap = attrs.$attr;
                    let nodeName;
                    switch (nodeType) {
                        case NodeType._ELEMENT_NODE /* Element */: {
                            nodeName = getNodeName(node);
                            if (ignoreDirective !== directiveNormalize(nodeName)) {
                                // use the node name: <directive>
                                addDirective(directives, directiveNormalize(nodeName), "E", maxPriority);
                            }
                            // iterate over the attributes
                            const nodeAttributes = node.attributes;
                            for (let j = 0, nodeAttributesLength = nodeAttributes?.length || 0; j < nodeAttributesLength; j++) {
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
                                    }
                                    else if (isNgEvent) {
                                        directives.push(createEventDirective($parse, $exceptionHandler, nName, name));
                                    }
                                    else {
                                        // isWindow
                                        directives.push(createWindowEventDirective($parse, $exceptionHandler, window, nName, name));
                                    }
                                }
                                else if (isNgObserve) {
                                    directives.push(ngObserveDirective(name, value));
                                }
                                else {
                                    // Update nName for cases where a prefix was removed
                                    // NOTE: the .toLowerCase() is unnecessary and causes https://github.com/angular/angular.ts/issues/16624 for ng-attr-*
                                    nName = directiveNormalize(name.toLowerCase());
                                    attrsMap[nName] = name;
                                    if (isNgAttr || !hasOwn(attrs, nName)) {
                                        attrs[nName] = value;
                                        if (getBooleanAttrName(node, nName)) {
                                            attrs[nName] = true; // presence means true
                                        }
                                    }
                                    addAttrInterpolateDirective(node, directives, value, nName, isNgAttr);
                                    if (nName !== ignoreDirective) {
                                        addDirective(directives, nName, "A", maxPriority);
                                    }
                                }
                            }
                            if (nodeName === "input" &&
                                node.getAttribute("type") === "hidden") {
                                // Hidden input elements can have strange behaviour when navigating back to the page
                                // This tells the browser not to try to cache and reinstate previous values
                                node.setAttribute("autocomplete", "off");
                            }
                            break;
                        }
                        case NodeType._TEXT_NODE:
                            addTextInterpolateDirective(directives, node.nodeValue ?? "");
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
                 */
                function compilationGenerator(eager, nodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
                    if (eager) {
                        return compile(nodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext);
                    }
                    const lazyCompilationState = {
                        _nodes: nodes,
                        _transcludeFn: transcludeFn,
                        _maxPriority: maxPriority,
                        _ignoreDirective: ignoreDirective,
                        _previousCompileContext: previousCompileContext,
                    };
                    /** Defers compilation until the returned linker/transclude function is first invoked. */
                    const lazyCompilation = function lazyCompilation(...args) {
                        return invokeLazyCompilation(lazyCompilation._state, ...args);
                    };
                    lazyCompilation._state = lazyCompilationState;
                    return lazyCompilation;
                }
                /** Shared invoker for lazily compiled public-link/transclude functions. */
                function invokeLazyCompilation(state, ...args) {
                    if (!state._compiled) {
                        state._compiled = compile(state._nodes, state._transcludeFn, state._maxPriority, state._ignoreDirective, state._previousCompileContext);
                        state._nodes = null;
                        state._transcludeFn = null;
                        state._previousCompileContext = null;
                    }
                    return state._compiled(...args);
                }
                /**
                 * Stores link metadata in a compact record so linking can use shared invokers instead of wrapped closures.
                 */
                function pushLinkFnRecord(linkFns, linkFn, require, directiveName, isolateScope, linkCtx, thisArg) {
                    if (!linkFn) {
                        return;
                    }
                    linkFns.push({
                        _fn: linkFn,
                        _require: require,
                        _directiveName: directiveName,
                        _isolateScope: isolateScope,
                        _linkCtx: linkCtx,
                        _thisArg: thisArg,
                    });
                }
                /** Invokes a link record with consistent scope selection and argument ordering. */
                function invokeLinkFnRecord(linkFnRecord, isolateScope, scope, node, attrs, controllers, transcludeFn) {
                    if (isDefined(linkFnRecord._linkCtx)) {
                        return linkFnRecord._fn(linkFnRecord._linkCtx, linkFnRecord._isolateScope ? isolateScope : scope, node, attrs, controllers, transcludeFn);
                    }
                    if (isDefined(linkFnRecord._thisArg)) {
                        return linkFnRecord._fn.call(linkFnRecord._thisArg, linkFnRecord._isolateScope ? isolateScope : scope, node, attrs, controllers, transcludeFn);
                    }
                    return linkFnRecord._fn(linkFnRecord._isolateScope ? isolateScope : scope, node, attrs, controllers, transcludeFn);
                }
                /** Shared post-link executor for text interpolation directives. */
                function textInterpolateLinkFn(linkState, scope, node) {
                    if (linkState._singleExpression) {
                        scope.$watch(linkState._watchExpression, (value) => {
                            applyTextInterpolationValue(node, stringify(value));
                        });
                        return;
                    }
                    const bindingState = {
                        _linkState: linkState,
                        _scope: scope,
                        _node: node,
                    };
                    scope.$watch(linkState._watchExpression, () => {
                        handleTextInterpolationWatch(bindingState);
                    });
                }
                /** Re-applies text interpolation using explicit per-link state. */
                function handleTextInterpolationWatch(bindingState) {
                    applyTextInterpolationValue(bindingState._node, bindingState._linkState._interpolateFn(deProxy(bindingState._scope)));
                }
                /**
                 * Applies the latest interpolated attribute value using the same class/srcset special cases
                 * as the original inline pre-link closure.
                 */
                function applyInterpolatedAttrValue(linkState, attr, value) {
                    if (linkState._name === "class") {
                        const element = attr._element();
                        attr.$updateClass(value, element.classList.value);
                        return;
                    }
                    if ((linkState._trustedContext === SCE_CONTEXTS._URL ||
                        linkState._trustedContext === SCE_CONTEXTS._MEDIA_URL) &&
                        !(isString(value) && value.startsWith("unsafe:"))) {
                        value = $sce.getTrusted(linkState._trustedContext, value);
                    }
                    attr.$set(linkState._name, linkState._name === "srcset"
                        ? $sce.getTrustedMediaUrl(value)
                        : value);
                }
                /** Re-applies the current interpolated attribute value from explicit per-link state. */
                function handleAttrInterpolationWatch(bindingState) {
                    const interpolateFn = bindingState._linkState._interpolateFn;
                    if (!interpolateFn) {
                        return;
                    }
                    applyInterpolatedAttrValue(bindingState._linkState, bindingState._attr, interpolateFn(bindingState._scope));
                }
                /**
                 * Shared pre-link executor for interpolated attributes. The mutable link state keeps the
                 * current interpolation function in sync if an earlier compile step rewrites the attribute.
                 */
                function attrInterpolatePreLinkFn(linkState, scope, _element, attr) {
                    // Recompute interpolation if another compile step rewrote the attribute value.
                    const attrsAny = attr;
                    const name = linkState._name;
                    const newValue = attrsAny[name];
                    if (newValue !== linkState._value) {
                        linkState._interpolateFn = newValue
                            ? $interpolate(newValue, true, linkState._trustedContext, linkState._allOrNothing)
                            : undefined;
                        linkState._value = newValue;
                    }
                    if (!linkState._interpolateFn) {
                        return;
                    }
                    const interpolateFn = linkState._interpolateFn;
                    const { expressions } = interpolateFn;
                    const observers = attr._observers || (attr._observers = nullObject());
                    const observer = observers[name] || (observers[name] = []);
                    attrsAny[name] = interpolateFn(scope);
                    observer._inter = true;
                    const bindingState = {
                        _linkState: linkState,
                        _scope: scope,
                        _attr: attr,
                    };
                    if (expressions.length > 0) {
                        const targetScope = observer._scope || scope;
                        const watchExpression = buildInterpolationWatchExpression(expressions);
                        targetScope.$watch(watchExpression, () => {
                            handleAttrInterpolationWatch(bindingState);
                        });
                    }
                    else {
                        handleAttrInterpolationWatch(bindingState);
                    }
                }
                /** Applies the current `ng-prop-*` value from explicit per-link state. */
                function updatePropertyDirectiveValue(bindingState) {
                    const linkState = bindingState._linkState;
                    bindingState._element[linkState._propName] = linkState._sanitizer(linkState._ngPropGetter(bindingState._scope));
                }
                /** Shared watch callback for property-name watchers. */
                function handlePropertyDirectiveValueWatch(bindingState) {
                    updatePropertyDirectiveValue(bindingState);
                }
                /** Shared watch callback for backing attribute-expression watchers. */
                function handlePropertyDirectiveAttrWatch(bindingState, value) {
                    $sce.valueOf(value);
                    updatePropertyDirectiveValue(bindingState);
                }
                /** Invokes an expression binding against the stored parent getter and scope target. */
                function invokeExpressionBinding(bindingState, locals) {
                    return (bindingState._parentGet &&
                        bindingState._parentGet(bindingState._scopeTarget, locals));
                }
                /**
                 * Shared pre-link executor for `ng-prop-*` bindings. Watch callbacks still need per-link state,
                 * but the compile-time getter/sanitizer wiring is now reused.
                 */
                function propertyDirectivePreLinkFn(linkState, scope, $element, attr) {
                    const attrsAny = attr;
                    const bindingState = {
                        _linkState: linkState,
                        _scope: scope,
                        _element: $element};
                    updatePropertyDirectiveValue(bindingState);
                    scope.$watch(linkState._propName, () => {
                        handlePropertyDirectiveValueWatch(bindingState);
                    });
                    scope.$watch(attrsAny[linkState._attrName], (val) => {
                        handlePropertyDirectiveAttrWatch(bindingState, val);
                    });
                }
                /**
                 * Links against a resolved async template using the already materialized node.
                 * This is the direct path for links that happen after the template has loaded.
                 */
                function invokeResolvedTemplateNodeLink(delayedState, scope, node, boundTranscludeFn) {
                    const afterTemplateNodeLinkFnCtx = delayedState._afterTemplateNodeLinkFnCtx;
                    if (!afterTemplateNodeLinkFnCtx) {
                        return;
                    }
                    let childBoundTranscludeFn = boundTranscludeFn;
                    if (afterTemplateNodeLinkFnCtx._transcludeOnThisElement) {
                        childBoundTranscludeFn = createBoundTranscludeFn(scope, afterTemplateNodeLinkFnCtx._transclude, boundTranscludeFn);
                    }
                    if (isDefined(afterTemplateNodeLinkFnCtx._nodeLinkFnState)) {
                        afterTemplateNodeLinkFnCtx._nodeLinkFn(afterTemplateNodeLinkFnCtx._nodeLinkFnState, delayedState._afterTemplateChildLinkFn, scope, node, childBoundTranscludeFn || null);
                    }
                    else {
                        afterTemplateNodeLinkFnCtx._nodeLinkFn(delayedState._afterTemplateChildLinkFn, scope, node, childBoundTranscludeFn || null);
                    }
                }
                /**
                 * Replays one queued link request after an async templateUrl has resolved.
                 * Queued requests may need clone/class reconciliation because the template DOM did not
                 * exist at the time the original link request was recorded.
                 */
                function replayResolvedTemplateNodeLink(delayedState, scope, beforeTemplateLinkNode, boundTranscludeFn) {
                    const afterTemplateNodeLinkFnCtx = delayedState._afterTemplateNodeLinkFnCtx;
                    const compiledNode = delayedState._compiledNode;
                    const compileNodeRef = delayedState._compileNodeRef;
                    if (!afterTemplateNodeLinkFnCtx || !compiledNode || !compileNodeRef) {
                        return;
                    }
                    if (scope._destroyed) {
                        return;
                    }
                    let linkNode = compileNodeRef._getAny();
                    if (beforeTemplateLinkNode !== delayedState._beforeTemplateCompileNode) {
                        const oldClasses = beforeTemplateLinkNode.className;
                        if (!(delayedState._previousCompileContext
                            ._hasElementTranscludeDirective &&
                            delayedState._origAsyncDirective.replace)) {
                            // The linked node was cloned before the template arrived; clone the resolved template too.
                            linkNode = compiledNode.cloneNode(true);
                            beforeTemplateLinkNode.appendChild(linkNode);
                        }
                        try {
                            if (oldClasses !== "") {
                                compileNodeRef.element.classList.forEach((cls) => beforeTemplateLinkNode.classList.add(cls));
                            }
                        }
                        catch {
                            // Ignore read-only SVG className updates.
                        }
                    }
                    invokeResolvedTemplateNodeLink(delayedState, scope, linkNode, boundTranscludeFn);
                }
                /**
                 * Removes one queued async `templateUrl` link request.
                 * This prevents unresolved delayed template state from retaining dead scopes/nodes.
                 */
                function removeDelayedTemplateNodeLinkEntry(delayedState, scope, node, boundTranscludeFn) {
                    const linkQueue = delayedState._linkQueue;
                    if (!linkQueue) {
                        return;
                    }
                    for (let queueIndex = 0; queueIndex < linkQueue.length; queueIndex += 3) {
                        if (linkQueue[queueIndex] === scope &&
                            linkQueue[queueIndex + 1] === node &&
                            linkQueue[queueIndex + 2] === boundTranscludeFn) {
                            linkQueue.splice(queueIndex, 3);
                            return;
                        }
                    }
                }
                /**
                 * Shared delayed link executor for async `templateUrl` directives. Until the template resolves,
                 * it stores link requests in a compact queue; afterwards it links directly against the resolved template.
                 */
                function invokeDelayedTemplateNodeLinkFn(delayedState, _ignoreChildLinkFn, scope, node, boundTranscludeFn) {
                    if (scope._destroyed) {
                        return;
                    }
                    if (delayedState._linkQueue) {
                        delayedState._linkQueue.push(scope, node, boundTranscludeFn);
                        const removeOnDestroy = scope.$on("$destroy", () => {
                            removeOnDestroy();
                            removeDelayedTemplateNodeLinkEntry(delayedState, scope, node, boundTranscludeFn);
                        });
                        return;
                    }
                    invokeResolvedTemplateNodeLink(delayedState, scope, node, boundTranscludeFn);
                }
                function finalizeDelayedTemplateLinkState(delayedState) {
                    delayedState._compileNodeRef?._release();
                    delayedState._compileNodeRef = undefined;
                    delayedState._linkQueue = null;
                }
                function replayDelayedTemplateLinkQueue(delayedState) {
                    for (let queueIndex = 0; delayedState._linkQueue &&
                        queueIndex < delayedState._linkQueue.length; queueIndex += 3) {
                        const scope = delayedState._linkQueue[queueIndex];
                        const beforeTemplateLinkNode = delayedState._linkQueue[queueIndex + 1];
                        const boundTranscludeFn = delayedState._linkQueue[queueIndex + 2];
                        if (!scope) {
                            continue;
                        }
                        replayResolvedTemplateNodeLink(delayedState, scope, beforeTemplateLinkNode, boundTranscludeFn);
                    }
                }
                function handleDelayedTemplateLoaded(delayedState, content) {
                    let compileNode;
                    let replacementState;
                    content = denormalizeTemplate(content);
                    if (delayedState._origAsyncDirective.replace) {
                        let templateNodes;
                        if (isTextNode(content)) {
                            templateNodes = [];
                        }
                        else if (isString(content)) {
                            templateNodes = arrayFrom(createNodelistFromHTML(content)).filter((node) => node.nodeType !== NodeType._COMMENT_NODE &&
                                node.nodeType !== NodeType._TEXT_NODE &&
                                node.nodeType === NodeType._ELEMENT_NODE);
                        }
                        else {
                            templateNodes = arrayFrom(wrapTemplate(delayedState._templateNamespace, trim(content))).filter((node) => node.nodeType === NodeType._ELEMENT_NODE);
                        }
                        compileNode = templateNodes[0];
                        if (templateNodes.length !== 1 ||
                            compileNode.nodeType !== NodeType._ELEMENT_NODE) {
                            throw $compileMinErr("tplrt", "Template for directive '{0}' must have exactly one root element. {1}", delayedState._origAsyncDirective.name, delayedState._templateUrl);
                        }
                        replacementState = {
                            _templateNodes: templateNodes,
                            _templateAttrs: { $attr: {} },
                        };
                        replaceWith(delayedState._compileNodeRef, compileNode, delayedState._previousCompileContext._index);
                        const templateDirectives = collectDirectives(compileNode, replacementState._templateAttrs);
                        if (isObject(delayedState._origAsyncDirective.scope)) {
                            markDirectiveScope(templateDirectives, true);
                        }
                        delayedState._directives = templateDirectives.concat(delayedState._directives);
                        mergeTemplateAttributes(delayedState._tAttrs, replacementState._templateAttrs);
                    }
                    else {
                        compileNode = delayedState._beforeTemplateCompileNode;
                        delayedState._compileNodeRef.element.innerHTML =
                            content;
                    }
                    delayedState._directives.unshift(delayedState._derivedSyncDirective);
                    delayedState._afterTemplateNodeLinkFnCtx = applyDirectivesToNode(delayedState._directives, compileNode, delayedState._tAttrs, delayedState._childTranscludeFn, delayedState._origAsyncDirective, delayedState._preLinkFns, delayedState._postLinkFns, {
                        ...delayedState._previousCompileContext,
                        _ctxNodeRef: delayedState._compileNodeRef,
                    });
                    if (delayedState._rootElement) {
                        entries(delayedState._rootElement).forEach(([i, node]) => {
                            if (node === compileNode) {
                                delayedState._rootElement[i] = delayedState._compileNodeRef;
                            }
                        });
                    }
                    delayedState._compiledNode = compileNode;
                    delayedState._afterTemplateChildLinkFn = compileNodes(new NodeRef(delayedState._compileNodeRef._getAny().childNodes), delayedState._childTranscludeFn, undefined, undefined, undefined);
                    try {
                        replayDelayedTemplateLinkQueue(delayedState);
                    }
                    finally {
                        finalizeDelayedTemplateLinkState(delayedState);
                    }
                }
                function handleDelayedTemplateLoadError(delayedState, error) {
                    delayedState._afterTemplateNodeLinkFnCtx = undefined;
                    delayedState._afterTemplateChildLinkFn = null;
                    delayedState._compiledNode = undefined;
                    finalizeDelayedTemplateLinkState(delayedState);
                    if (isError(error)) {
                        $exceptionHandler(error);
                    }
                    else {
                        $exceptionHandler(new Error(String(error)));
                    }
                }
                /** Handles `$transclude(...)` calls for the shared node-link executor. */
                function invokeControllersBoundTransclude(transcludeState, scopeParam, cloneAttachFn, _futureParentElement, slotName) {
                    if (transcludeState._destroyed) {
                        return undefined;
                    }
                    const hasScope = isScope(scopeParam);
                    const boundTranscludeFn = transcludeState._boundTranscludeFn;
                    const transcludeControllers = transcludeState._hasElementTranscludeDirective
                        ? transcludeState._elementControllers
                        : undefined;
                    const transcludedScope = hasScope ? scopeParam : undefined;
                    const attachFn = (hasScope ? cloneAttachFn : scopeParam);
                    const requestedSlotName = (hasScope ? slotName : _futureParentElement);
                    const futureParentElement = (hasScope ? _futureParentElement : cloneAttachFn) ||
                        (transcludeState._hasElementTranscludeDirective
                            ? transcludeState._elementRef.node.parentElement
                            : transcludeState._elementRef.node);
                    if (requestedSlotName) {
                        const slotTranscludeFn = boundTranscludeFn._slots[requestedSlotName];
                        if (slotTranscludeFn) {
                            return slotTranscludeFn(transcludedScope, attachFn, transcludeControllers, futureParentElement, transcludeState._scopeToChild);
                        }
                        if (isUndefined(slotTranscludeFn)) {
                            throw $compileMinErr("noslot", 'No parent directive that requires a transclusion with slot name "{0}". ' +
                                "Element: {1}", requestedSlotName, startingTag(transcludeState._elementRef.element));
                        }
                        return undefined;
                    }
                    return boundTranscludeFn(transcludedScope, attachFn, transcludeControllers, futureParentElement, transcludeState._scopeToChild);
                }
                function createControllersBoundTranscludeFn(transcludeState) {
                    const wrapper = function wrapper(scopeParam, cloneAttachFn, _futureParentElement, slotName) {
                        return invokeControllersBoundTransclude(wrapper._state, scopeParam, cloneAttachFn, _futureParentElement, slotName);
                    };
                    wrapper._state = transcludeState;
                    wrapper._boundTransclude = transcludeState._boundTranscludeFn;
                    wrapper.isSlotFilled = isControllersBoundTranscludeSlotFilled;
                    transcludeState._wrapper = wrapper;
                    return wrapper;
                }
                /** Shared slot-filled predicate for controllers-bound transclude wrappers. */
                function isControllersBoundTranscludeSlotFilled(slotName) {
                    const state = this._state;
                    return !!state?._boundTranscludeFn?._slots[slotName];
                }
                /**
                 * Reuses one implementation for the standard node-link path by passing all compile-time
                 * state explicitly instead of closing over it in a per-node function.
                 */
                function invokeStoredNodeLinkFn(nodeLinkState, childLinkFn, scope, linkNode, boundTranscludeFn) {
                    let isolateScope;
                    let controllerScope;
                    let elementControllers = nullObject();
                    let scopeToChild = scope;
                    let $element;
                    let attrs;
                    let scopeBindingInfo;
                    if (nodeLinkState._compileNode === linkNode) {
                        attrs = nodeLinkState._templateAttrs;
                        $element = nodeLinkState._templateAttrs._nodeRef;
                    }
                    else {
                        $element = new NodeRef(linkNode);
                        registerScopeOwnedNodeRef(scope, $element);
                        attrs = new Attributes($injector, $exceptionHandler, $sce, $element, nodeLinkState._templateAttrs);
                    }
                    controllerScope = scope;
                    if (nodeLinkState._newIsolateScopeDirective) {
                        isolateScope = scope.$newIsolate();
                    }
                    else if (nodeLinkState._newScopeDirective) {
                        controllerScope = scope.$parent;
                    }
                    controllerScope = controllerScope || scope;
                    let transcludeFn = nodeLinkState._transcludeFn;
                    let transcludeState;
                    if (boundTranscludeFn) {
                        transcludeState = {
                            _boundTranscludeFn: boundTranscludeFn,
                            _elementControllers: elementControllers,
                            _hasElementTranscludeDirective: nodeLinkState._hasElementTranscludeDirective,
                            _scopeToChild: scopeToChild,
                            _elementRef: $element,
                        };
                        const currentTranscludeState = transcludeState;
                        scope.$on("$destroy", () => {
                            releaseControllersBoundTranscludeState(currentTranscludeState);
                        });
                        transcludeFn = createControllersBoundTranscludeFn(transcludeState);
                    }
                    const controllerDirectives = nodeLinkState._controllerDirectives || nullObject();
                    if (nodeLinkState._controllerDirectives) {
                        elementControllers = setupControllers($element, attrs, transcludeFn, nodeLinkState._controllerDirectives, isolateScope || scope, scope, nodeLinkState._newIsolateScopeDirective);
                        if (transcludeState) {
                            syncControllersBoundTranscludeState(transcludeState, scopeToChild, elementControllers, $element);
                        }
                    }
                    if (nodeLinkState._newIsolateScopeDirective && isolateScope) {
                        isolateScope.$target._isolateBindings = nodeLinkState
                            ._newIsolateScopeDirective._isolateBindings;
                        scopeBindingInfo = initializeDirectiveBindings(scope, attrs, isolateScope, isolateScope._isolateBindings, nodeLinkState._newIsolateScopeDirective);
                        if (scopeBindingInfo._removeWatches) {
                            isolateScope.$on("$destroy", scopeBindingInfo._removeWatches);
                        }
                    }
                    for (const name in elementControllers) {
                        const controllerDirective = controllerDirectives[name];
                        const controller = elementControllers[name];
                        const bindings = controllerDirective._bindings
                            ._bindToController;
                        const controllerInstance = controller();
                        controller._instance = controllerScope.$new(controllerInstance);
                        setCacheData($element.node, `$${controllerDirective.name}Controller`, controller._instance);
                        controller._bindingInfo = initializeDirectiveBindings(controllerScope, attrs, controller._instance, bindings, controllerDirective);
                    }
                    if (nodeLinkState._controllerDirectives) {
                        const controllerNames = keys(controllerDirectives);
                        for (let i = 0, l = controllerNames.length; i < l; i++) {
                            const name = controllerNames[i];
                            const controllerDirective = controllerDirectives[name];
                            const { require } = controllerDirective;
                            if (controllerDirective.bindToController &&
                                !isArray(require) &&
                                isObject(require)) {
                                extend(elementControllers[name]._instance, getControllers(name, require, $element.element, elementControllers));
                            }
                        }
                    }
                    if (elementControllers) {
                        const controllerNames = keys(elementControllers);
                        for (let i = 0, l = controllerNames.length; i < l; i++) {
                            const controller = elementControllers[controllerNames[i]];
                            const controllerInstance = controller._instance;
                            if (isFunction(controllerInstance.$onChanges)) {
                                try {
                                    controllerInstance.$onChanges(controller._bindingInfo._initialChanges);
                                }
                                catch (err) {
                                    $exceptionHandler(err);
                                }
                            }
                            if (isFunction(controllerInstance.$onInit)) {
                                try {
                                    controllerInstance.$target.$onInit();
                                }
                                catch (err) {
                                    $exceptionHandler(err);
                                }
                            }
                            if (isFunction(controllerInstance.$onDestroy)) {
                                controllerScope.$on("$destroy", () => {
                                    controllerInstance.$onDestroy();
                                });
                            }
                            controllerScope.$on("$destroy", () => {
                                if (!controllerInstance._destroyed) {
                                    controllerInstance.$destroy();
                                }
                            });
                        }
                    }
                    for (let i = 0, ii = nodeLinkState._preLinkFns.length; i < ii; i++) {
                        const preLinkFn = nodeLinkState._preLinkFns[i];
                        const controllers = preLinkFn._require &&
                            getControllers(preLinkFn._directiveName, preLinkFn._require, $element.element, elementControllers);
                        try {
                            invokeLinkFnRecord(preLinkFn, isolateScope, scope, $element.node, attrs, controllers, transcludeFn);
                        }
                        catch (err) {
                            $exceptionHandler(err);
                        }
                    }
                    if (nodeLinkState._newIsolateScopeDirective &&
                        (nodeLinkState._newIsolateScopeDirective.template ||
                            nodeLinkState._newIsolateScopeDirective.templateUrl === null)) {
                        scopeToChild = isolateScope || scope;
                        if (transcludeState) {
                            syncControllersBoundTranscludeState(transcludeState, scopeToChild, elementControllers, $element);
                        }
                    }
                    if (childLinkFn &&
                        linkNode.childNodes &&
                        linkNode.childNodes.length) {
                        childLinkFn(scopeToChild, linkNode.childNodes, boundTranscludeFn);
                    }
                    for (let i = nodeLinkState._postLinkFns.length - 1; i >= 0; i--) {
                        const postLinkFn = nodeLinkState._postLinkFns[i];
                        const controllers = postLinkFn._require &&
                            getControllers(postLinkFn._directiveName, postLinkFn._require, $element.node, elementControllers);
                        try {
                            if (postLinkFn._isolateScope && isolateScope) {
                                deleteCacheData($element.element, _scope);
                                setIsolateScope($element.element, isolateScope);
                            }
                            invokeLinkFnRecord(postLinkFn, isolateScope, scope, $element.node, attrs, controllers, transcludeFn);
                        }
                        catch (err) {
                            $exceptionHandler(err);
                        }
                    }
                    if (elementControllers) {
                        const controllerNames = keys(elementControllers);
                        for (let i = 0, l = controllerNames.length; i < l; i++) {
                            const controller = elementControllers[controllerNames[i]];
                            const controllerInstance = controller._instance;
                            if (isFunction(controllerInstance.$postLink)) {
                                controllerInstance.$postLink();
                            }
                        }
                    }
                }
                /**
                 * Applies a sorted set of directives to a single node and produces the node-level link context.
                 *
                 * Responsibilities:
                 * - Run directive `compile()` functions (and collect pre/post link fns).
                 * - Inline templates / handle `replace`, `templateUrl`, and transclusion.
                 * - Track terminal directives and scope requirements for later linking.
                 */
                function applyDirectivesToNode(directives, compileNode, templateAttrs, transcludeFn, originalReplaceDirective, preLinkFns, postLinkFns, previousCompileContext) {
                    previousCompileContext = previousCompileContext || {};
                    preLinkFns = preLinkFns || [];
                    postLinkFns = postLinkFns || [];
                    let terminalPriority = -Number.MAX_VALUE;
                    let terminal = false;
                    let { _newScopeDirective, _controllerDirectives, _newIsolateScopeDirective, _templateDirective, _nonTlbTranscludeDirective, _hasElementTranscludeDirective, } = previousCompileContext;
                    const { _ctxNodeRef, _parentNodeRef } = previousCompileContext;
                    let hasTranscludeDirective = false;
                    let hasTemplate = false;
                    let compileNodeRef = new NodeRef(compileNode);
                    const { _index } = previousCompileContext;
                    templateAttrs._nodeRef = compileNodeRef;
                    let directive;
                    let directiveName;
                    let $template;
                    let replaceDirective = originalReplaceDirective;
                    let childTranscludeFn = transcludeFn;
                    let didScanForMultipleTransclusion = false;
                    let mightHaveMultipleTransclusionError = false;
                    let directiveValue;
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
                                    assertNoDuplicate("new/isolated scope", _newIsolateScopeDirective || _newScopeDirective, directive, compileNodeRef);
                                    _newIsolateScopeDirective = directive;
                                }
                                else {
                                    // This directive is trying to add a child scope.
                                    // Check that there is no isolated scope already
                                    assertNoDuplicate("new/isolated scope", _newIsolateScopeDirective, directive, compileNodeRef);
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
                        const hasReplacedTemplate = directive.replace &&
                            (directive.templateUrl || directive.template);
                        const shouldTransclude = directive.transclude &&
                            !EXCLUDED_DIRECTIVES.includes(directiveName);
                        if (!didScanForMultipleTransclusion &&
                            (hasReplacedTemplate || shouldTransclude)) {
                            let candidateDirective;
                            for (let scanningIndex = i + 1; (candidateDirective = directives[scanningIndex++]);) {
                                if ((candidateDirective.transclude &&
                                    !EXCLUDED_DIRECTIVES.includes(candidateDirective.name || "")) ||
                                    (candidateDirective.replace &&
                                        (candidateDirective.templateUrl ||
                                            candidateDirective.template))) {
                                    mightHaveMultipleTransclusionError = true;
                                    break;
                                }
                            }
                            didScanForMultipleTransclusion = true;
                        }
                        if (!directive.templateUrl && directive.controller) {
                            _controllerDirectives = _controllerDirectives || nullObject();
                            assertNoDuplicate(`'${directiveName}' controller`, _controllerDirectives[directiveName], directive, compileNodeRef);
                            _controllerDirectives[directiveName] = directive;
                        }
                        directiveValue = directive.transclude;
                        if (directiveValue) {
                            hasTranscludeDirective = true;
                            // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
                            // This option should only be used by directives that know how to safely handle element transclusion,
                            // where the transcluded nodes are added or replaced after linking.
                            if (!EXCLUDED_DIRECTIVES.includes(directiveName)) {
                                assertNoDuplicate("transclusion", _nonTlbTranscludeDirective, directive, compileNodeRef);
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
                                    if (_ctxNodeRef._isList && _index !== undefined) {
                                        _ctxNodeRef._setIndex(_index, compileNode);
                                    }
                                    else {
                                        _ctxNodeRef.node = compileNode;
                                    }
                                }
                                replaceWith(new NodeRef($template._element), compileNode, _index);
                                childTranscludeFn = compilationGenerator(mightHaveMultipleTransclusionError, $template._element, transcludeFn, terminalPriority, replaceDirective ? replaceDirective.name : undefined, {
                                    // Don't pass in:
                                    // - _controllerDirectives - otherwise we'll create duplicates controllers
                                    // - _newIsolateScopeDirective or _templateDirective - combining templates with
                                    //   element transclusion doesn't make sense.
                                    //
                                    // We need only _nonTlbTranscludeDirective so that we prevent putting transclusion
                                    // on the same element more than once.
                                    _nonTlbTranscludeDirective,
                                });
                            }
                            else {
                                const slots = nullObject();
                                let nodes;
                                if (!isObject(directiveValue)) {
                                    //
                                    // Clone childnodes before clearing contents on transcluded directives
                                    // Create a temporary container to preserve separate text nodes without browser normalization
                                    // (see https://github.com/angular/angular.ts/issues/14924)
                                    const tempContainer = document.createElement("div");
                                    const { childNodes } = compileNode;
                                    for (let childIndex = 0, childCount = childNodes.length; childIndex < childCount; childIndex++) {
                                        tempContainer.appendChild(childNodes[childIndex].cloneNode(true));
                                    }
                                    nodes = tempContainer.childNodes;
                                }
                                else {
                                    // We have transclusion slots,
                                    // collect them up, compile them and store their transclusion functions
                                    // Use a temporary container to preserve separate text nodes without browser normalization
                                    // (see https://github.com/angular/angular.ts/issues/14924)
                                    const tempContainer = document.createElement("div");
                                    const slotMap = nullObject();
                                    const filledSlots = nullObject();
                                    // Parse the element selectors
                                    const slotNames = keys(directiveValue);
                                    for (let slotIndex = 0, slotCount = slotNames.length; slotIndex < slotCount; slotIndex++) {
                                        const slotName = slotNames[slotIndex];
                                        let elementSelector = directiveValue[slotName];
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
                                    }
                                    // Clone childnodes before distributing to slots
                                    // Clone each node individually to prevent browser DOM normalization
                                    // which can merge adjacent text nodes (see https://github.com/angular/angular.ts/issues/14924)
                                    const { childNodes } = compileNode;
                                    // Add the matching elements into their slot
                                    for (let childIndex = 0, childCount = childNodes.length; childIndex < childCount; childIndex++) {
                                        const node = childNodes[childIndex].cloneNode(true);
                                        const slotName = node.nodeType === NodeType._ELEMENT_NODE
                                            ? slotMap[directiveNormalize(getNodeName(node))]
                                            : undefined;
                                        if (slotName) {
                                            filledSlots[slotName] = true;
                                            slots[slotName] =
                                                slots[slotName] || createDocumentFragment();
                                            slots[slotName].appendChild(node);
                                        }
                                        else {
                                            tempContainer.appendChild(node);
                                        }
                                    }
                                    // Check for required slots that were not filled
                                    const filledSlotNames = keys(filledSlots);
                                    for (let slotIndex = 0, slotCount = filledSlotNames.length; slotIndex < slotCount; slotIndex++) {
                                        const slotName = filledSlotNames[slotIndex];
                                        const filled = filledSlots[slotName];
                                        if (!filled) {
                                            throw $compileMinErr("reqslot", "Required transclusion slot `{0}` was not filled.", slotName);
                                        }
                                    }
                                    for (const slotName in slots) {
                                        if (slots[slotName]) {
                                            // Only define a transclusion function if the slot was filled
                                            // Convert to static array to prevent DOM normalization of text nodes
                                            const slotCompileNodes = slots[slotName].childNodes;
                                            slots[slotName] = compilationGenerator(mightHaveMultipleTransclusionError, slotCompileNodes, transcludeFn, undefined, undefined, previousCompileContext);
                                        }
                                    }
                                    nodes = tempContainer.childNodes;
                                }
                                emptyElement(compileNode); // clear contents on transcluded directives
                                // lazily compile transcluded template and generate a transcluded link function
                                childTranscludeFn = compilationGenerator(mightHaveMultipleTransclusionError, nodes, transcludeFn, undefined, undefined, {
                                    _needsNewScope: directive._isolateScope || directive._newScope,
                                });
                                childTranscludeFn._slots = slots;
                            }
                        }
                        if (directive.template) {
                            hasTemplate = true;
                            assertNoDuplicate("template", _templateDirective, directive, compileNodeRef);
                            _templateDirective = directive;
                            directiveValue = isFunction(directive.template)
                                ? directive.template(compileNodeRef.element, templateAttrs)
                                : directive.template;
                            directiveValue = denormalizeTemplate(directiveValue);
                            if (directive.replace) {
                                replaceDirective = directive;
                                if (isTextNode(directiveValue)) {
                                    $template = [];
                                }
                                else {
                                    $template = wrapTemplate(directive.templateNamespace, trim(directiveValue));
                                }
                                if (isString($template)) {
                                    $template = arrayFrom(createNodelistFromHTML($template)).filter((x) => x.nodeType === NodeType._ELEMENT_NODE);
                                }
                                compileNode = $template[0];
                                if ($template.length !== 1 ||
                                    compileNode.nodeType !== NodeType._ELEMENT_NODE) {
                                    throw $compileMinErr("tplrt", "Template for directive '{0}' must have exactly one root element. {1}", directiveName, "");
                                }
                                replaceWith(compileNodeRef, compileNode);
                                if (_parentNodeRef && _index !== undefined) {
                                    _parentNodeRef._setIndex(_index, compileNode);
                                }
                                const newTemplateAttrs = { $attr: {} };
                                // combine directives from the original node and from the template:
                                // - take the array of directives for this element
                                // - split it into two parts, those that already applied (processed) and those that weren't (unprocessed)
                                // - collect directives from the template and sort them by priority
                                // - combine directives as: processed + template + unprocessed
                                const _templateDirectives = collectDirectives(compileNode, newTemplateAttrs);
                                const unprocessedDirectives = directives.splice(i + 1, directives.length - (i + 1));
                                if (_newIsolateScopeDirective || _newScopeDirective) {
                                    // The original directive caused the current element to be replaced but this element
                                    // also needs to have a new scope, so we need to tell the template directives
                                    // that they would need to get their scope from further up, if they require transclusion
                                    markDirectiveScope(_templateDirectives, _newIsolateScopeDirective, _newScopeDirective);
                                }
                                directives = directives
                                    .concat(_templateDirectives)
                                    .concat(unprocessedDirectives);
                                mergeTemplateAttributes(templateAttrs, newTemplateAttrs);
                                ii = directives.length;
                            }
                            else {
                                if (compileNodeRef._isElement()) {
                                    compileNodeRef.element.innerHTML = directiveValue;
                                }
                            }
                        }
                        if (directive.templateUrl) {
                            hasTemplate = true;
                            assertNoDuplicate("template", _templateDirective, directive, compileNodeRef);
                            _templateDirective = directive;
                            if (directive.replace) {
                                replaceDirective = directive;
                            }
                            ({ _nodeLinkFn: nodeLinkFn, _nodeLinkFnState: nodeLinkFnState } =
                                compileTemplateUrl(directives.splice(i, directives.length - i), compileNodeRef, templateAttrs, compileNode, (hasTranscludeDirective &&
                                    childTranscludeFn), preLinkFns, postLinkFns, {
                                    _index,
                                    _controllerDirectives,
                                    _newScopeDirective: _newScopeDirective !== directive
                                        ? _newScopeDirective
                                        : undefined,
                                    _newIsolateScopeDirective,
                                    _templateDirective,
                                    _nonTlbTranscludeDirective,
                                    _futureParentElement: previousCompileContext._futureParentElement,
                                }));
                            ii = directives.length;
                        }
                        else if (directive.compile) {
                            try {
                                const linkFn = directive.compile(compileNodeRef._getAny(), templateAttrs, childTranscludeFn);
                                const context = directive._originalDirective || directive;
                                const isolateScope = _newIsolateScopeDirective === directive ||
                                    !!directive._isolateScope;
                                if (isFunction(linkFn)) {
                                    const linkCtx = linkFn._linkCtx;
                                    pushLinkFnRecord(postLinkFns, linkFn, directive.require, directiveName, isolateScope, linkCtx, isDefined(linkCtx) ? undefined : context);
                                }
                                else if (linkFn) {
                                    const preLinkCtx = linkFn._preLinkCtx || linkFn._linkCtx;
                                    const postLinkCtx = linkFn._postLinkCtx || linkFn._linkCtx;
                                    pushLinkFnRecord(preLinkFns, linkFn.pre, directive.require, directiveName, isolateScope, preLinkCtx, isDefined(preLinkCtx) ? undefined : context);
                                    pushLinkFnRecord(postLinkFns, linkFn.post, directive.require, directiveName, isolateScope, postLinkCtx, isDefined(postLinkCtx) ? undefined : context);
                                }
                            }
                            catch (err) {
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
                        nodeLinkFn = invokeStoredNodeLinkFn;
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
                        _newScope: !!(_newScopeDirective && _newScopeDirective.scope === true),
                    };
                }
                /** Resolves required controllers from the current element or its ancestors. */
                function getControllers(directiveName, require, $element, elementControllers) {
                    let value;
                    if (isString(require)) {
                        const match = require.match(REQUIRE_PREFIX_REGEXP);
                        if (!match) {
                            return null;
                        }
                        const name = require.substring(match[0].length);
                        const inheritType = match[1] || match[3];
                        const optional = match[2] === "?";
                        // If only parents then start at the parent element
                        if (inheritType === "^^") {
                            if ($element && $element.parentElement) {
                                $element = $element.parentElement;
                            }
                            else {
                                $element = undefined;
                            }
                            // Otherwise attempt getting the controller from elementControllers in case
                            // the element is transcluded (and has no data) and to avoid .data if possible
                        }
                        else {
                            value = elementControllers && elementControllers[name];
                            value = value && value._instance;
                        }
                        if (!value) {
                            const dataName = `$${name}Controller`;
                            if (inheritType === "^^" &&
                                $element &&
                                $element.nodeType === NodeType._DOCUMENT_NODE) {
                                // inheritedData() uses the documentElement when it finds the document, so we would
                                // require from the element itself.
                                value = null;
                            }
                            else {
                                value = $element
                                    ? inheritType
                                        ? getInheritedData($element, dataName)
                                        : getCacheData($element, dataName)
                                    : undefined;
                            }
                        }
                        if (!value && !optional) {
                            throw $compileMinErr("ctreq", "Controller '{0}', required by directive '{1}', can't be found!", name, directiveName);
                        }
                    }
                    else if (isArray(require)) {
                        value = [];
                        for (let i = 0, ii = require.length; i < ii; i++) {
                            value[i] = getControllers(directiveName, require[i], $element, elementControllers);
                        }
                    }
                    else if (isObject(require)) {
                        value = {};
                        const requireKeys = keys(require);
                        for (let i = 0, l = requireKeys.length; i < l; i++) {
                            const property = requireKeys[i];
                            const controller = require[property];
                            value[property] = getControllers(directiveName, controller, $element, elementControllers);
                        }
                    }
                    return value || null;
                }
                /** Instantiates and stores directive controllers for the current node. */
                function setupControllers($element, attrs, transcludeFn, _controllerDirectives, isolateScope, scope, _newIsolateScopeDirective) {
                    const elementControllers = nullObject();
                    for (const controllerKey in _controllerDirectives) {
                        const directive = _controllerDirectives[controllerKey];
                        const locals = {
                            $scope: directive === _newIsolateScopeDirective ||
                                directive._isolateScope
                                ? isolateScope
                                : scope,
                            $element: $element.node,
                            $attrs: attrs,
                            $transclude: transcludeFn,
                        };
                        let { controller } = directive;
                        if (controller === "@") {
                            controller = attrs[directive.name];
                        }
                        const controllerInstance = $controller(controller, locals, true, directive.controllerAs);
                        // For directives with element transclusion the element is a comment.
                        // In this case .data will not attach any data.
                        // Instead, we save the controllers for the element in a local hash and attach to .data
                        // later, once we have the actual element.
                        elementControllers[directive.name] = controllerInstance;
                        if ($element._isElement()) {
                            setCacheData($element.element, `$${directive.name}Controller`, controllerInstance._instance);
                        }
                    }
                    return elementControllers;
                }
                // Depending upon the context in which a directive finds itself it might need to have a new isolated
                // or child scope created. For instance:
                // * if the directive has been pulled into a template because another directive with a higher priority
                // asked for element transclusion
                // * if the directive itself asks for transclusion but it is at the root of a template and the original
                // element was replaced. See https://github.com/angular/angular.ts/issues/12936
                /** Marks a directive list with inherited isolate/new-scope metadata. */
                function markDirectiveScope(directives, isolateScope, newScope) {
                    for (let j = 0, jj = directives.length; j < jj; j++) {
                        directives[j] = inherit(directives[j], {
                            _isolateScope: isolateScope,
                            _newScope: newScope,
                        });
                    }
                }
                /**
                 * Looks up a directive by normalized name and adds any matching definitions to the collection.
                 *
                 * `location` restricts which directive kinds are allowed, using the usual compile flags such as
                 * `E` for elements and `A` for attributes.
                 */
                function addDirective(tDirectives, name, location, maxPriority) {
                    let match = false;
                    const maxPriorityValue = isUndefined(maxPriority)
                        ? Number.MAX_VALUE
                        : maxPriority;
                    if (hasOwn(hasDirectives, name)) {
                        const directives = (hasOwn(directiveLookupCache, name)
                            ? directiveLookupCache[name]
                            : (directiveLookupCache[name] = $injector.get(name + DirectiveSuffix))) || [];
                        for (let i = 0, ii = directives.length; i < ii; i++) {
                            const directive = directives[i];
                            if (maxPriorityValue > (directive.priority || 0) &&
                                directive.restrict?.indexOf(location) !== -1) {
                                if (!directive._bindings) {
                                    const bindings = (directive._bindings =
                                        parseDirectiveBindings(directive, directive.name));
                                    if (isObject(bindings._isolateScope)) {
                                        directive._isolateBindings = bindings._isolateScope;
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
                 * @param dst - Destination attributes (original DOM).
                 * @param src - Source attributes (from the directive template).
                 */
                function mergeTemplateAttributes(dst, src) {
                    const dstAny = dst;
                    const srcAny = src;
                    const srcAttr = src.$attr;
                    const dstAttr = dst.$attr;
                    // reapply the old attributes to the new element
                    const dstKeys = keys(dstAny);
                    for (let i = 0, l = dstKeys.length; i < l; i++) {
                        const key = dstKeys[i];
                        let value = dstAny[key];
                        if (key[0] !== "$" && key[0] !== "_") {
                            if (srcAny[key] && srcAny[key] !== value) {
                                if (value.length) {
                                    value += (key === "style" ? ";" : " ") + srcAny[key];
                                }
                                else {
                                    value = srcAny[key];
                                }
                            }
                            dst.$set(key, value, true, srcAttr[key]);
                        }
                    }
                    // copy the new attributes on the old attrs object
                    const srcKeys = keys(srcAny);
                    for (let i = 0, l = srcKeys.length; i < l; i++) {
                        const key = srcKeys[i];
                        const value = srcAny[key];
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
                    }
                }
                /** Compiles an async `templateUrl` directive and returns a delayed node-link descriptor. */
                function compileTemplateUrl(directives, $compileNode, tAttrs, $rootElement, childTranscludeFn, preLinkFns, postLinkFns, previousCompileContext) {
                    const origAsyncDirective = directives.shift();
                    const derivedSyncDirective = inherit(origAsyncDirective, {
                        templateUrl: null,
                        transclude: null,
                        replace: null,
                        _originalDirective: origAsyncDirective,
                    });
                    let templateUrl;
                    if (isFunction(origAsyncDirective.templateUrl)) {
                        templateUrl = origAsyncDirective.templateUrl.call(origAsyncDirective, $compileNode.element, tAttrs);
                    }
                    else {
                        templateUrl = origAsyncDirective.templateUrl || "";
                    }
                    const { templateNamespace } = origAsyncDirective;
                    const delayedState = {
                        _linkQueue: [],
                        _directives: directives,
                        _afterTemplateChildLinkFn: null,
                        _beforeTemplateCompileNode: $compileNode._getAny(),
                        _childTranscludeFn: childTranscludeFn,
                        _compileNodeRef: $compileNode,
                        _derivedSyncDirective: derivedSyncDirective,
                        _origAsyncDirective: origAsyncDirective,
                        _postLinkFns: postLinkFns,
                        _preLinkFns: preLinkFns,
                        _previousCompileContext: previousCompileContext,
                        _rootElement: $rootElement,
                        _tAttrs: tAttrs,
                        _templateUrl: templateUrl,
                        _templateNamespace: templateNamespace,
                    };
                    emptyElement($compileNode.element);
                    $templateRequest(templateUrl || "")
                        .then((content) => {
                        handleDelayedTemplateLoaded(delayedState, content);
                    })
                        .catch((error) => {
                        handleDelayedTemplateLoadError(delayedState, error);
                    });
                    return {
                        _nodeLinkFn: invokeDelayedTemplateNodeLinkFn,
                        _nodeLinkFnState: delayedState,
                    };
                }
                /** Throws when multiple directives request an incompatible exclusive feature on the same node. */
                function assertNoDuplicate(what, previousDirective, directive, element) {
                    if (previousDirective) {
                        throw $compileMinErr("multidir", "Multiple directives [{0}, {1}] asking for {3} on: {4}", previousDirective.name, directive.name, what, startingTag(element._getAny()));
                    }
                }
                /** Adds a synthetic text-interpolation directive for a text node. */
                function addTextInterpolateDirective(directives, text) {
                    const interpolateFn = $interpolate(text, true);
                    if (interpolateFn) {
                        const { expressions } = interpolateFn;
                        const watchExpression = buildInterpolationWatchExpression(expressions);
                        const linkState = {
                            _interpolateFn: interpolateFn,
                            _watchExpression: watchExpression,
                            _singleExpression: expressions.length === 1 &&
                                text ===
                                    $interpolate.startSymbol() +
                                        watchExpression +
                                        $interpolate.endSymbol(),
                        };
                        const directive = {
                            priority: 0,
                            compile: compileTextInterpolateDirective,
                            _compileState: linkState,
                        };
                        directives.push(directive);
                    }
                }
                /** Shared compile function for synthetic text-interpolation directives. */
                function compileTextInterpolateDirective() {
                    return {
                        post: textInterpolateLinkFn,
                        _postLinkCtx: this._compileState,
                    };
                }
                /** Determines the SCE trust context required for a DOM attribute binding. */
                function getTrustedAttrContext(nodeName, attrNormalizedName) {
                    if (attrNormalizedName === "srcdoc") {
                        return SCE_CONTEXTS._HTML;
                    }
                    // All nodes with src attributes require a RESOURCE_URL value, except for
                    // img and various html5 media nodes, which require the MEDIA_URL context.
                    if (attrNormalizedName === "src" || attrNormalizedName === "ngSrc") {
                        if (["img", "video", "audio", "source", "track"].indexOf(nodeName) ===
                            -1) {
                            return SCE_CONTEXTS._RESOURCE_URL;
                        }
                        return SCE_CONTEXTS._MEDIA_URL;
                    }
                    if (nodeName === "image" &&
                        (attrNormalizedName === "href" || attrNormalizedName === "ngHref")) {
                        return SCE_CONTEXTS._MEDIA_URL;
                    }
                    if (
                    // Formaction
                    (nodeName === "form" && attrNormalizedName === "action") ||
                        // If relative URLs can go where they are not expected to, then
                        // all sorts of trust issues can arise.
                        (nodeName === "base" && attrNormalizedName === "href") ||
                        // links can be stylesheets or imports, which can run script in the current origin
                        (nodeName === "link" && attrNormalizedName === "href")) {
                        return SCE_CONTEXTS._RESOURCE_URL;
                    }
                    if (nodeName === "a" &&
                        (attrNormalizedName === "href" || attrNormalizedName === "ngHref")) {
                        return SCE_CONTEXTS._URL;
                    }
                    return undefined;
                }
                /** Determines the SCE trust context required for a DOM property binding. */
                function getTrustedPropContext(nodeName, propNormalizedName) {
                    const prop = propNormalizedName.toLowerCase();
                    return (PROP_CONTEXTS[`${nodeName}|${prop}`] || PROP_CONTEXTS[`*|${prop}`]);
                }
                /** Sanitizes a `srcset` string by trusting each URI entry individually. */
                function sanitizeSrcset(value, invokeType) {
                    if (!value) {
                        return value;
                    }
                    if (!isString(value)) {
                        throw $compileMinErr("srcset", 'Can\'t pass trusted values to `{0}`: "{1}"', invokeType, String(value));
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
                    // Split on candidate separators, including malformed descriptor tokens such as `xyz,`.
                    // Without the generic whitespace-token-comma branch, a payload like
                    // `good.example/img.png xyz,evil.example/img.png` leaves the second URL unsanitized.
                    const srcPattern = /(\s+\d+(?:\.\d+)?x\s*,|\s+\d+w\s*,|\s+[^\s,]+\s*,|\s+,|,\s+)/;
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
                /** Adds an `ng-prop-*` directive for the given property binding. */
                function addPropertyDirective(node, directives, attrName, propName) {
                    if (EVENT_HANDLER_ATTR_REGEXP.test(propName)) {
                        throw $compileMinErr("nodomevents", "Property bindings for HTML DOM event properties are disallowed");
                    }
                    const nodeName = getNodeName(node);
                    const trustedContext = getTrustedPropContext(nodeName, propName);
                    let sanitizer = (x) => x;
                    // Sanitize img[srcset] + source[srcset] values.
                    if (propName === "srcset" &&
                        (nodeName === "img" || nodeName === "source")) {
                        sanitizer = (value) => sanitizeSrcset($sce.valueOf(value), "ng-prop-srcset");
                    }
                    else if (trustedContext) {
                        sanitizer = $sce.getTrusted.bind($sce, trustedContext);
                    }
                    const directive = {
                        priority: 100,
                        compile: compilePropertyDirective,
                        _compileState: {
                            _attrName: attrName,
                            _propName: propName,
                            _sanitizer: sanitizer,
                        },
                    };
                    directives.push(directive);
                }
                /** Shared compile function for synthetic `ng-prop-*` directives. */
                function compilePropertyDirective(_, attr) {
                    const compileState = this._compileState;
                    return {
                        pre: propertyDirectivePreLinkFn,
                        _preLinkCtx: {
                            _attrName: compileState._attrName,
                            _propName: compileState._propName,
                            _ngPropGetter: $parse(attr[compileState._attrName]),
                            _sanitizer: compileState._sanitizer,
                        },
                    };
                }
                /** Adds an interpolated-attribute directive for the given attribute value. */
                function addAttrInterpolateDirective(node, directives, value, name, isNgAttr) {
                    const nodeName = getNodeName(node);
                    const trustedContext = getTrustedAttrContext(nodeName, name);
                    const mustHaveExpression = !isNgAttr;
                    const allOrNothing = ALL_OR_NOTHING_ATTRS.includes(name) || isNgAttr;
                    const interpolateFn = $interpolate(value, mustHaveExpression, trustedContext, allOrNothing);
                    // no interpolation found -> ignore
                    if (!interpolateFn) {
                        return;
                    }
                    if (name === "multiple" && nodeName === "select") {
                        throw $compileMinErr("selmulti", "Binding to the 'multiple' attribute is not supported. Element: {0}", startingTag(node.outerHTML));
                    }
                    if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
                        throw $compileMinErr("nodomevents", "Interpolations for HTML DOM event attributes are disallowed");
                    }
                    const directive = {
                        priority: 100,
                        compile: compileAttrInterpolateDirective,
                        _compileState: {
                            _name: name,
                            _value: value,
                            _trustedContext: trustedContext,
                            _allOrNothing: allOrNothing,
                            _interpolateFn: interpolateFn,
                        },
                    };
                    directives.push(directive);
                }
                /** Shared compile function for synthetic interpolated-attribute directives. */
                function compileAttrInterpolateDirective() {
                    return {
                        pre: attrInterpolatePreLinkFn,
                        _preLinkCtx: this._compileState,
                    };
                }
                /** Enforces strict component binding requirements for required attributes. */
                function strictBindingsCheck(attrName, directiveName) {
                    if (strictComponentBindingsEnabled) {
                        throw $compileMinErr("missingattr", "Attribute '{0}' of '{1}' is non-optional and must be set!", attrName, directiveName);
                    }
                }
                /**
                 * Sets up `$watch` and `$observe` wiring for isolate-scope and controller bindings.
                 */
                function initializeDirectiveBindings(scope, attrs, destination, bindings, directive) {
                    const removeWatchCollection = [];
                    const initialChanges = {};
                    const attrsAny = attrs;
                    const destAny = destination;
                    const scopeTarget = scope.$target;
                    const destinationTarget = destAny.$target;
                    const attrsObservers = attrs._observers || (attrs._observers = nullObject());
                    const bindingChangeState = {
                        _destAny: destAny,
                        _onChangesQueue: onChangesQueueState,
                        _scope: scope,
                    };
                    if (bindings) {
                        const bindingNames = keys(bindings);
                        for (let bindingIndex = 0; bindingIndex < bindingNames.length; bindingIndex++) {
                            const scopeName = bindingNames[bindingIndex];
                            const definition = bindings[scopeName];
                            const { _attrName: attrName, _optional: optional, _mode: mode, // @, =, <, or &
                             } = definition;
                            let lastValue;
                            let parentGet;
                            let parentSet;
                            let compare;
                            let removeWatch;
                            switch (mode) {
                                case "@":
                                    if (!optional && !hasOwn(attrs, attrName)) {
                                        strictBindingsCheck(attrName, directive.name);
                                        destAny[scopeName] = attrsAny[attrName] = undefined;
                                    }
                                    const stringBindingState = {
                                        _bindingChangeState: bindingChangeState,
                                        _destAny: destAny,
                                        _firstCall: true,
                                        _firstChange: true,
                                        _scopeName: scopeName,
                                    };
                                    removeWatch = attrs.$observe(attrName, (value) => handleStringBindingObserve(stringBindingState, value));
                                    attrsObservers[attrName]._scope = scope;
                                    lastValue = attrsAny[attrName];
                                    if (isString(lastValue)) {
                                        // If the attribute has been provided then we trigger an interpolation to ensure
                                        // the value is there for use in the link fn
                                        destAny[scopeName] = $interpolate(lastValue)(scope);
                                    }
                                    else if (isBoolean(lastValue)) {
                                        // If the attributes is one of the BOOLEAN_ATTR then AngularTS will have converted
                                        // the value to boolean rather than a string, so we special case this situation
                                        destAny[scopeName] = lastValue;
                                    }
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
                                    }
                                    else {
                                        compare = simpleCompare;
                                    }
                                    parentSet =
                                        (parentGet && parentGet._assign) ||
                                            function () {
                                                throw $compileMinErr("nonassign", "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!", attrsAny[attrName], attrName, directive.name);
                                            };
                                    // store the value that the parent scope had after the last check:
                                    const initialValue = parentGet && parentGet(scopeTarget);
                                    lastValue = destinationTarget[scopeName] = isArray(initialValue)
                                        ? createScope(initialValue, destination.$handler)
                                        : initialValue;
                                    const twoWayBindingState = {
                                        _attrName: attrName,
                                        _attrsAny: attrsAny,
                                        _compare: compare,
                                        _destAny: destAny,
                                        _destinationTarget: destinationTarget,
                                        _directiveName: directive.name,
                                        _lastValue: lastValue,
                                        _parentGet: parentGet,
                                        _parentSet: parentSet,
                                        _scope: scope,
                                        _scopeName: scopeName,
                                        _scopeTarget: scopeTarget,
                                    };
                                    if (attrsAny[attrName]) {
                                        const expr = attrsAny[attrName];
                                        const syncParentValue = $parse(expr, (parentValue) => syncTwoWayParentValue(twoWayBindingState, parentValue));
                                        // make it lazy as we dont want to trigger the two way data binding at this point
                                        scope.$watch(expr, (val) => handleTwoWayExpressionChange(twoWayBindingState, syncParentValue, val), true);
                                    }
                                    removeWatch = destination.$watch(attrName, (val) => handleTwoWayDestinationChange(twoWayBindingState, val), true);
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
                                        parentGet && parentGet(scopeTarget);
                                    const oneWayBindingState = {
                                        _bindingChangeState: bindingChangeState,
                                        _destAny: destAny,
                                        _firstChange: true,
                                        _scopeName: scopeName,
                                    };
                                    initialChanges[scopeName] = {
                                        currentValue: destAny.$target[scopeName],
                                        firstChange: oneWayBindingState._firstChange,
                                    };
                                    scope.$target.attrs = attrs;
                                    if (attrsAny[attrName]) {
                                        removeWatch = scope.$watch(attrsAny[attrName], (val) => handleOneWayBindingChange(oneWayBindingState, val), true);
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
                                    const expressionBindingState = {
                                        _parentGet: parentGet,
                                        _scopeTarget: scopeTarget,
                                    };
                                    destAny.$target[scopeName] = function (locals) {
                                        return invokeExpressionBinding(expressionBindingState, locals);
                                    };
                                    break;
                            }
                        }
                    }
                    return {
                        _initialChanges: initialChanges,
                        _removeWatches: removeWatchCollection.length > 0
                            ? () => removeDirectiveBindingWatches(removeWatchCollection)
                            : undefined,
                    };
                }
            },
        ];
    }
}
/* @ignore */ CompileProvider.$inject = [_provide];
/** Validates a directive/component name before registration. */
function assertValidDirectiveName(name) {
    const letter = name.charAt(0);
    if (!letter || letter !== letter.toLowerCase()) {
        throw $compileMinErr("baddir", "Directive/Component name '{0}' is invalid. The first character must be a lowercase letter", name);
    }
    if (name !== name.trim()) {
        throw $compileMinErr("baddir", "Directive/Component name '{0}' is invalid. The name should not contain leading or trailing whitespaces", name);
    }
}
/**
 * Normalizes the `require` declaration for a directive.
 * Object-form requires inherit their own key when the value omits the directive name
 * (e.g. `{ foo: "^^" }` becomes `{ foo: "^^foo" }`).
 */
function getDirectiveRequire(directive) {
    const require = directive.require || (directive.controller && directive.name);
    if (!isArray(require) && isObject(require)) {
        const entryList = entries(require);
        for (let i = 0; i < entryList.length; i++) {
            const [key, value] = entryList[i];
            const match = value.match(REQUIRE_PREFIX_REGEXP);
            if (!match)
                continue;
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
 */
function getDirectiveRestrict(restrict, name) {
    if (restrict && !(isString(restrict) && /[EA]/.test(restrict))) {
        throw $compileMinErr("badrestrict", "Restrict property '{0}' of directive '{1}' is invalid", restrict, name);
    }
    return isString(restrict) ? restrict : "EA";
}
/**
 * Detects the namespace used when compiling child nodes beneath a parent element.
 * This is primarily used to decide whether template wrapping should happen in HTML or SVG mode.
 */
function detectNamespaceForChildElements(parentElement) {
    const node = parentElement;
    if (!node) {
        return "html";
    }
    return (node.nodeType !== NodeType._ELEMENT_NODE ||
        getNodeName(node) !== "foreignobject") &&
        toString.call(node).match(/SVG/)
        ? "svg"
        : "html";
}
/**
 * Builds a stable node array for linking so index-based mappings stay valid even if DOM shape changes.
 */
function buildStableNodeList(state, nodeRef) {
    let stableNodeList = [];
    if (state._nodeLinkFnFound) {
        const stableLength = isInstanceOf(nodeRef, NodeRef)
            ? nodeRef.size
            : nodeRef.length;
        stableNodeList = new Array(stableLength);
        for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
            const { _index: idx } = state._linkFnsList[i];
            stableNodeList[idx] = isInstanceOf(nodeRef, NodeRef)
                ? nodeRef._getIndex(idx)
                : nodeRef[idx];
        }
    }
    else if (isInstanceOf(nodeRef, NodeRef)) {
        for (let i = 0, l = nodeRef.size; i < l; i++) {
            stableNodeList.push(nodeRef._getIndex(i));
        }
    }
    else {
        for (let i = 0, l = nodeRef.length; i < l; i++) {
            stableNodeList.push(nodeRef[i]);
        }
    }
    return stableNodeList;
}
/**
 * Serializes one or more interpolation inputs into the watch expression used by `$watch`.
 * Single expressions stay unchanged; multi-input interpolations are packed into an array expression.
 */
function buildInterpolationWatchExpression(expressions) {
    return expressions.length === 1
        ? expressions[0]
        : `[${expressions.join(",")}]`;
}
/**
 * Writes the interpolated text result to either an element node or a text node.
 */
function applyTextInterpolationValue(node, value) {
    switch (node.nodeType) {
        case NodeType._ELEMENT_NODE:
            node.innerHTML = value;
            break;
        default:
            node.nodeValue = value;
    }
}
/**
 * Sorts directives by priority, then name, then registration index.
 * This matches the compiler's directive application order.
 */
function byPriority(a, b) {
    const diff = (b.priority || 0) - (a.priority || 0);
    if (diff !== 0) {
        return diff;
    }
    if (a.name !== b.name) {
        return a.name < b.name ? -1 : 1;
    }
    return (a.index || 0) - (b.index || 0);
}
/**
 * Wraps non-HTML templates in a temporary namespace container so the browser parses SVG/MathML correctly.
 */
function wrapTemplate(type, template) {
    type = (type || "html").toLowerCase();
    switch (type) {
        case "svg":
        case "math": {
            const wrapper = document.createElement("div");
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
 */
function replaceWith(elementsToRemove, newNode, index) {
    const firstElementToRemove = elementsToRemove._getAny();
    const parent = firstElementToRemove.parentNode;
    if (parent) {
        if (isDefined(index)) {
            const oldChild = parent.childNodes[index];
            if (oldChild) {
                parent.replaceChild(newNode, oldChild);
            }
        }
        else {
            parent.replaceChild(newNode, firstElementToRemove);
        }
    }
    const fragment = createDocumentFragment();
    elementsToRemove._collection().forEach((element) => {
        fragment.appendChild(element);
    });
    elementsToRemove.node = newNode;
}

export { CompileProvider, DirectiveSuffix, applyTextInterpolationValue, buildInterpolationWatchExpression, buildStableNodeList, byPriority, detectNamespaceForChildElements, getDirectiveRequire, getDirectiveRestrict, replaceWith, wrapTemplate };
