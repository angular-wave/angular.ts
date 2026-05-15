import { _injector, _interpolate, _exceptionHandler, _parse, _controller, _templateRequest, _scope, _provide } from '../../injection-tokens.js';
import { getBooleanAttrName, setTranscludedHostElement, emptyElement, isTextNode, createNodelistFromHTML, createDocumentFragment, startingTag, createElementFromHTML, setScope, setCacheData, deleteCacheData, setIsolateScope, getInheritedData, getCacheData, FUTURE_PARENT_ELEMENT_KEY } from '../../shared/dom.js';
import { NodeType } from '../../shared/node.js';
import { NodeRef } from '../../shared/noderef.js';
import { identifierForController } from '../controller/controller.js';
import { createScope } from '../scope/scope.js';
import { getSecurityAdapter } from '../security/security-adapter.js';
import { assign, getNodeName, uppercase, hasOwn, assertDefined, isFunction, trim, nullObject, inherit, stringify, directiveNormalize, assertArg, assertNotHasOwnProperty, deleteProperty, deProxy, isError, extend, callFunction, createErrorFactory, simpleCompare, isScope, equals } from '../../shared/utils.js';
import { SCE_CONTEXTS } from '../../services/sce/context.js';
import { PREFIX_REGEXP } from '../../shared/constants.js';
import { createEventDirective, createWindowEventDirective } from '../../directive/events/events.js';
import { Attributes } from './attributes.js';
import { ngObserveDirective } from '../../directive/observe/observe.js';

const EMPTY_DIRECTIVE_MATCHES = [];
const EMPTY_DIRECTIVE_DEFINITIONS = [];
const EMPTY_PARSED_DIRECTIVE_BINDINGS = Object.freeze({
    _isolateScope: null,
    _bindToController: null,
});
const EMPTY_LINK_FN_RECORDS = Object.freeze([]);
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
    transcludeState._elementNode = undefined;
}
function syncControllersBoundTranscludeState(transcludeState, scopeToChild, elementControllers, elementNode) {
    transcludeState._scopeToChild = scopeToChild;
    transcludeState._elementControllers = elementControllers;
    transcludeState._elementNode = elementNode;
}
const $compileError = createErrorFactory("$compile");
const REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;
// Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
// The assumption is that future DOM event attribute names will begin with
// 'on' and be composed of only English letters.
const EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;
const NG_PREFIX_BINDING = /^ng(Attr|Prop|On|Observe|Window)([A-Z].*)$/;
const LOWERCASE_N_CHAR_CODE = "n".charCodeAt(0);
const LOWERCASE_G_CHAR_CODE = "g".charCodeAt(0);
const ISOLATE_BINDING_REGEXP = /^([@&]|[=<]())(\??)\s*([\w$]*)$/;
const valueFn = (value) => () => value;
const DirectiveSuffix = "Directive";
class CompileProvider {
    /** Configures directive registration and compile-time provider behavior. */
    constructor($provide) {
        const directiveFactoryRegistry = {};
        const bindingCache = nullObject();
        const directiveDefinitionCache = nullObject();
        const normalizedDirectiveNameCache = nullObject();
        function normalizeDirectiveName(name) {
            let normalizedName = normalizedDirectiveNameCache[name];
            if (normalizedName === undefined) {
                normalizedName = normalizedDirectiveNameCache[name] =
                    directiveNormalize(name);
            }
            return normalizedName;
        }
        /** Parses isolate-scope or controller binding definitions for a directive. */
        function parseIsolateBindings(scope, directiveName, isController) {
            const bindings = nullObject();
            for (const scopeName in scope) {
                if (!hasOwn(scope, scopeName)) {
                    continue;
                }
                let definition = scope[scopeName];
                definition = definition.trim();
                if (definition in bindingCache) {
                    bindings[scopeName] = bindingCache[definition];
                    continue;
                }
                const parsedBinding = parseIsolateBindingDefinition(definition, scopeName, directiveName, isController);
                bindings[scopeName] = parsedBinding._binding;
                if (parsedBinding._cacheable) {
                    bindingCache[definition] = parsedBinding._binding;
                }
            }
            return bindings;
        }
        function parseIsolateBindingDefinition(definition, scopeName, directiveName, isController) {
            const match = ISOLATE_BINDING_REGEXP.exec(definition);
            if (!match) {
                throw $compileError("iscp", "Invalid {3} for directive '{0}'." +
                    " Definition: {... {1}: '{2}' ...}", directiveName, scopeName, definition, isController
                    ? "controller bindings definition"
                    : "isolate scope definition");
            }
            return {
                _binding: {
                    _mode: match[1][0],
                    _collection: match[2] === "*",
                    _optional: match[3] === "?",
                    _attrName: match[4] || scopeName,
                },
                _cacheable: !!match[4],
            };
        }
        /** Collects the parsed scope and controller binding configuration for a directive. */
        function parseDirectiveBindings(directive, directiveName) {
            const bindings = {
                _isolateScope: null,
                _bindToController: null,
            };
            if (directive.scope !== null && typeof directive.scope === "object") {
                if (directive.bindToController === true) {
                    bindings._bindToController = parseIsolateBindings(directive.scope, directiveName, true);
                    bindings._isolateScope = {};
                }
                else {
                    bindings._isolateScope = parseIsolateBindings(directive.scope, directiveName, false);
                }
            }
            if (directive.bindToController !== null &&
                typeof directive.bindToController === "object") {
                bindings._bindToController = parseIsolateBindings(directive.bindToController, directiveName, true);
            }
            if (bindings._bindToController && !directive.controller) {
                // There is no controller
                throw $compileError("noctrl", "Cannot bind to controller without directive '{0}'s controller.", directiveName);
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
            if (typeof name === "string") {
                assertNotHasOwnProperty(name, "directive");
                assertValidDirectiveName(name);
                assertArg(directiveFactory, "directiveFactory");
                const normalizedDirectiveFactory = assertDefined(directiveFactory);
                if (!hasOwn(directiveFactoryRegistry, name)) {
                    directiveFactoryRegistry[name] = [];
                    $provide.factory(name + DirectiveSuffix, [
                        _injector,
                        _exceptionHandler,
                        /** Instantiates and normalizes the registered directive factories for one name. */
                        function ($injector, $exceptionHandler) {
                            const directives = [];
                            for (let i = 0, l = directiveFactoryRegistry[name].length; i < l; i++) {
                                const directiveFactoryInstance = directiveFactoryRegistry[name][i];
                                try {
                                    let directive = $injector.invoke(directiveFactoryInstance);
                                    if (isFunction(directive)) {
                                        directive = {
                                            compile: valueFn(directive),
                                        };
                                    }
                                    else {
                                        const directiveObject = directive;
                                        if (!directiveObject.compile && directiveObject.link) {
                                            directiveObject.compile = valueFn(directiveObject.link);
                                        }
                                    }
                                    const normalizedDirective = directive;
                                    normalizedDirective.priority =
                                        normalizedDirective.priority || 0;
                                    normalizedDirective.index = i;
                                    normalizedDirective.name = normalizedDirective.name || name;
                                    normalizedDirective.require =
                                        getDirectiveRequire(normalizedDirective);
                                    const restrict = getDirectiveRestrict(normalizedDirective.restrict, name);
                                    normalizedDirective.restrict = restrict;
                                    normalizedDirective._restrictElement = restrict.includes("E");
                                    normalizedDirective._restrictAttribute =
                                        restrict.includes("A");
                                    normalizedDirective._mayHaveBindings =
                                        (normalizedDirective.scope !== null &&
                                            typeof normalizedDirective.scope === "object") ||
                                            (normalizedDirective.bindToController !== null &&
                                                typeof normalizedDirective.bindToController === "object");
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
                directiveFactoryRegistry[name].push(normalizedDirectiveFactory);
                deleteProperty(directiveDefinitionCache, name);
            }
            else {
                for (const key in name) {
                    if (hasOwn(name, key)) {
                        this.directive(key, name[key]);
                    }
                }
            }
            return this;
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
            if (typeof name !== "string") {
                for (const key in name) {
                    if (hasOwn(name, key)) {
                        this.component(key, name[key]);
                    }
                }
                return this;
            }
            const componentOptions = assertDefined(options);
            const controller = componentOptions.controller ||
                function () {
                    /* empty */
                    return undefined;
                };
            /** Creates the component-backed directive definition factory. */
            function factory($injector) {
                /** Wraps injectable component options so `$element` and `$attrs` are available. */
                const makeInjectable = (fn) => {
                    if (isFunction(fn) || Array.isArray(fn)) {
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
                for (const key in componentOptions) {
                    if (key.startsWith("$")) {
                        const val = componentOptions[key];
                        ddo[key] = val;
                    }
                }
                return ddo;
            }
            // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
            // These could be used by libraries such as the new component router
            for (const key in componentOptions) {
                if (key.startsWith("$")) {
                    const val = componentOptions[key];
                    factory[key] = val;
                    // Don't try to copy over annotations to named controller
                    if (isFunction(controller)) {
                        controller[key] = val;
                    }
                }
            }
            factory.$inject = [_injector];
            return this.directive(name, factory);
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
                if (enabled !== undefined) {
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
         * @param ctx - The security context in which this value is safe for use, e.g. `url`
         * @returns `this` for chaining.
         */
        this.addPropertySecurityContext = function (elementName, propertyName, ctx) {
            const normalizedCtx = LEGACY_SCE_CONTEXTS[ctx] || ctx;
            const key = `${elementName.toLowerCase()}|${propertyName.toLowerCase()}`;
            if (key in PROP_CONTEXTS && PROP_CONTEXTS[key] !== normalizedCtx) {
                throw $compileError("ctxoverride", "Property context '{0}.{1}' already set to '{2}', cannot override to '{3}'.", elementName, propertyName, PROP_CONTEXTS[key], normalizedCtx);
            }
            PROP_CONTEXTS[key] = normalizedCtx;
            return this;
        };
        /* Default property contexts.
         *
         * Copy of https://github.com/angular/angular/blob/6.0.6/packages/compiler/src/schema/dom_security_schema.ts#L31-L58
         * Changing:
         * - SecurityContext.* => AngularTS security contexts
         * - various URL => MEDIA_URL
         * - *|formAction, form|action URL => RESOURCE_URL (like the attribute)
         */
        (function registerNativePropertyContexts() {
            /** Registers the same security context for a list of `element|property` keys. */
            function registerContext(ctx, items) {
                for (let i = 0, l = items.length; i < l; i++) {
                    PROP_CONTEXTS[items[i].toLowerCase()] = ctx;
                }
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
            _parse,
            _controller,
            /** Creates the runtime `$compile` service and its shared helper closures. */
            ($injector, $interpolate, $exceptionHandler, $parse, $controller) => {
                const security = getSecurityAdapter($injector);
                let lazyTemplateRequest;
                function requestTemplate(templateUrl) {
                    if (lazyTemplateRequest === undefined) {
                        lazyTemplateRequest = $injector.has(_templateRequest)
                            ? $injector.get(_templateRequest)
                            : null;
                    }
                    return lazyTemplateRequest
                        ? lazyTemplateRequest(templateUrl)
                        : fetchTemplate(templateUrl);
                }
                function fetchTemplate(templateUrl) {
                    return fetch(templateUrl, {
                        headers: { Accept: "text/html" },
                    }).then((response) => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch template "${templateUrl}": ${response.status} ${response.statusText}`);
                        }
                        return response.text();
                    });
                }
                const onChangesQueueState = {
                    _exceptionHandler: $exceptionHandler,
                    _queue: [],
                    _flush: undefined,
                };
                // This function is called in a $postUpdate to trigger all the onChanges hooks in a single digest
                onChangesQueueState._flush = () => {
                    flushDirectiveBindingOnChangesQueue(onChangesQueueState);
                };
                const startSymbol = $interpolate.startSymbol();
                const endSymbol = $interpolate.endSymbol();
                const denormalizeTemplate = startSymbol === "{{" && endSymbol === "}}"
                    ? (x) => x
                    : (x) => x.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);
                function triggerDirectiveBindingOnChanges(state) {
                    if (state._destAny.$onChanges && state._changes) {
                        callFunction(state._destAny.$onChanges, state._destAny, state._changes);
                    }
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
                    throw $compileError("nonassign", "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!", String(state._attrsAny[state._attrName]), state._attrName, state._directiveName);
                }
                function syncTwoWayParentValue(state, parentValue) {
                    const destValue = state._destAny[state._scopeName];
                    if (!state._compare(parentValue, destValue)) {
                        if (!state._compare(parentValue, state._lastValue)) {
                            state._destAny[state._scopeName] = parentValue;
                        }
                        else {
                            callFunction(state._parentSet, undefined, state._scope, (parentValue = state._destAny[state._scopeName]));
                        }
                    }
                    state._lastValue = parentValue;
                    return state._lastValue;
                }
                function handleTwoWayExpressionChange(state, syncParentValue, val) {
                    state._scopeTarget[state._attrName] = val;
                    syncParentValue(state._scope);
                }
                function handleTwoWayDestinationChange(state, val) {
                    if (val === state._lastValue &&
                        state._attrsAny[state._attrName] !== undefined) {
                        return;
                    }
                    if ((state._parentGet &&
                        !!state._parentGet._inputs &&
                        !state._parentGet._literal) ||
                        (state._attrsAny[state._attrName] === undefined &&
                            val !== undefined)) {
                        state._destinationTarget[state._scopeName] = state._lastValue;
                        throwNonassignBindingError(state);
                    }
                    if (val !== null && typeof val === "object") {
                        const valRecord = val;
                        for (const key in val) {
                            if (!hasOwn(valRecord, key)) {
                                continue;
                            }
                            state._scopeTarget[key] = valRecord[key];
                        }
                        return;
                    }
                    callFunction(state._parentSet, undefined, state._scopeTarget, (state._lastValue = val));
                    const attributeWatchers = state._scope.$handler._watchers.get(String(state._attrsAny[state._attrName]));
                    if (attributeWatchers) {
                        for (let i = 0, l = attributeWatchers.length; i < l; i++) {
                            attributeWatchers[i]._listenerFn(val, state._scope.$target);
                        }
                    }
                }
                function handleStringBindingObserve(state, value) {
                    if (typeof value !== "string" && typeof value !== "boolean") {
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
                    if (state._literal) {
                        const inputs = evaluateOneWayBindingInputs(state);
                        if (inputs && state._lastInputs) {
                            let sameInputs = inputs.length === state._lastInputs.length;
                            for (let i = 0, l = inputs.length; sameInputs && i < l; i++) {
                                sameInputs = simpleCompare(inputs[i], state._lastInputs[i]);
                            }
                            if (sameInputs) {
                                return;
                            }
                        }
                        state._lastInputs = inputs;
                    }
                    state._destAny.$target[state._scopeName] =
                        state._literal || val === null || typeof val !== "object"
                            ? val
                            : createScope(val, state._bindingChangeState._scope.$handler);
                    recordDirectiveBindingChange(state._bindingChangeState, state._scopeName, state._destAny.$target[state._scopeName], state._firstChange);
                    if (state._firstChange) {
                        state._firstChange = false;
                    }
                }
                function evaluateOneWayBindingInputs(state) {
                    const inputs = state._parentGet?._inputs;
                    if (!Array.isArray(inputs)) {
                        return undefined;
                    }
                    const values = new Array(inputs.length);
                    for (let i = 0, l = inputs.length; i < l; i++) {
                        values[i] = callFunction(inputs[i], undefined, state._scopeTarget);
                    }
                    return values;
                }
                function createPublicLinkNodes(element) {
                    if (!element) {
                        return null;
                    }
                    if (typeof element === "string") {
                        return [createElementFromHTML(element)];
                    }
                    if (element instanceof NodeList) {
                        return snapshotNodeList(element);
                    }
                    return [element];
                }
                function snapshotNodeList(nodes) {
                    return Array.prototype.slice.call(nodes);
                }
                function cloneTemplateNodes(nodes) {
                    const cloned = new Array(nodes.length);
                    for (let i = 0, l = nodes.length; i < l; i++) {
                        cloned[i] = nodes[i].cloneNode(true);
                    }
                    return cloned;
                }
                function getSingleTemplateElement(nodes) {
                    if (nodes.length !== 1) {
                        return undefined;
                    }
                    const node = nodes[0];
                    return node.nodeType === NodeType._ELEMENT_NODE
                        ? node
                        : undefined;
                }
                function getTemplateDom(nodes) {
                    if (nodes.length === 1) {
                        return nodes[0];
                    }
                    const firstNode = nodes[0];
                    if (firstNode && !firstNode.parentElement) {
                        const fragment = createDocumentFragment();
                        for (let i = 0, l = nodes.length; i < l; i++) {
                            fragment.appendChild(nodes[i]);
                        }
                        return fragment;
                    }
                    return nodes;
                }
                function getTemplateLinkResult(nodes) {
                    if (nodes.length === 1) {
                        return nodes[0];
                    }
                    return Array.prototype.slice.call(nodes);
                }
                function invokePublicLink(state, scope, cloneConnectFn, options) {
                    const { _nodes: nodes } = state;
                    if (!nodes) {
                        throw $compileError("multilink", "This element has already been linked.");
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
                    if (_parentBoundTranscludeFn?._boundTransclude) {
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
                        fragment.append(getTemplateNodeAt(nodes, 0));
                        const wrappedTemplate = wrapTemplate(state._namespace, fragment.innerHTML);
                        $linkNode = [wrappedTemplate[0]];
                    }
                    else if (cloneConnectFn) {
                        $linkNode = cloneTemplateNodes(nodes);
                    }
                    else {
                        $linkNode = nodes;
                    }
                    const linkElement = getSingleTemplateElement($linkNode);
                    if (linkElement) {
                        setScope(linkElement, scope);
                        if (_futureParentElement) {
                            setCacheData(linkElement, FUTURE_PARENT_ELEMENT_KEY, _futureParentElement);
                        }
                    }
                    if (_transcludeControllers) {
                        const controllers = _transcludeControllers;
                        for (const controllerName in controllers) {
                            if (linkElement) {
                                setCacheData(linkElement, `$${controllerName}Controller`, controllers[controllerName]._instance);
                            }
                        }
                    }
                    if (cloneConnectFn) {
                        cloneConnectFn(getTemplateDom($linkNode), scope);
                    }
                    if (state._templateLinkExecutor) {
                        state._templateLinkExecutor(scope, $linkNode, _parentBoundTranscludeFn);
                    }
                    if (!cloneConnectFn) {
                        state._nodes = null;
                        state._templateLinkExecutor = null;
                    }
                    return getTemplateLinkResult($linkNode);
                }
                function executeTemplateLinkPlan(plan, scope, nodeRef, _parentBoundTranscludeFn) {
                    const stableNodeList = buildStableNodeList(plan, nodeRef);
                    executeTemplateLinkMappings(plan, stableNodeList, scope, _parentBoundTranscludeFn || null);
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
                    const publicLinkState = createPublicLinkState(element, previousCompileContext);
                    const templatePlan = planTemplate(publicLinkState._nodes, transcludeFn || undefined, maxPriority, ignoreDirective, previousCompileContext);
                    if (templatePlan?._nodeRefList &&
                        !(templatePlan._nodeRefList instanceof NodeRef)) {
                        publicLinkState._nodes = templatePlan._nodeRefList;
                    }
                    publicLinkState._templateLinkExecutor = templatePlan
                        ? createTemplateLinkExecutor(templatePlan)
                        : null;
                    return createPublicLinkFn(publicLinkState);
                }
                function createPublicLinkState(element, previousCompileContext) {
                    return {
                        _nodes: createPublicLinkNodes(element),
                        _templateLinkExecutor: null,
                        _namespace: null,
                        _previousCompileContext: previousCompileContext || null,
                    };
                }
                function createPublicLinkFn(publicLinkState) {
                    const publicLinkFn = function publicLinkFn(scope, cloneConnectFn, options) {
                        return invokePublicLink(assertDefined(publicLinkFn
                            ._state), scope, cloneConnectFn, options);
                    };
                    publicLinkFn._state = publicLinkState;
                    return publicLinkFn;
                }
                /**
                 * Runs node-level and child-level link functions for one compiled node list using precomputed mapping state.
                 */
                function executeTemplateLinkMappings(plan, stableNodeList, scope, _parentBoundTranscludeFn) {
                    const nodeLinkPlans = plan._nodeLinkPlans;
                    const childLinkExecutors = plan._childLinkExecutors;
                    for (let i = 0, l = plan._nodeIndices.length; i < l; i++) {
                        executeTemplateLinkMapping(plan, nodeLinkPlans[i], childLinkExecutors[i], stableNodeList[i], scope, _parentBoundTranscludeFn);
                    }
                }
                function executeTemplateLinkMapping(plan, nodeLinkPlan, childLinkExecutor, node, scope, _parentBoundTranscludeFn) {
                    let childScope;
                    let childBoundTranscludeFn;
                    if (nodeLinkPlan) {
                        childScope = nodeLinkPlan._newScope ? scope.$new() : scope;
                        if (nodeLinkPlan._transcludeOnThisElement) {
                            childBoundTranscludeFn = createBoundTranscludeFn(scope, nodeLinkPlan._transclude, _parentBoundTranscludeFn || null);
                        }
                        else if (!nodeLinkPlan._templateOnThisElement &&
                            _parentBoundTranscludeFn) {
                            childBoundTranscludeFn = _parentBoundTranscludeFn;
                        }
                        else if (!_parentBoundTranscludeFn && plan._transcludeFn) {
                            childBoundTranscludeFn = createBoundTranscludeFn(scope, plan._transcludeFn, null);
                        }
                        else {
                            childBoundTranscludeFn = null;
                        }
                        if (nodeLinkPlan._newScope &&
                            node.nodeType === NodeType._ELEMENT_NODE) {
                            setScope(node, childScope);
                        }
                        if (nodeLinkPlan._nodeLinkFnState !== undefined) {
                            nodeLinkPlan._nodeLinkFn(nodeLinkPlan._nodeLinkFnState, childLinkExecutor, childScope, node, childBoundTranscludeFn);
                        }
                        else {
                            nodeLinkPlan._nodeLinkFn(childLinkExecutor, childScope, node, childBoundTranscludeFn);
                        }
                    }
                    else if (childLinkExecutor) {
                        childLinkExecutor(scope, node.childNodes, _parentBoundTranscludeFn);
                    }
                }
                function getTemplateNodeCount(nodes) {
                    return nodes.length;
                }
                function getTemplateNodeAt(nodes, index) {
                    return nodes[index];
                }
                function getPlanningNodeAt(nodes, nodeRefPlan, index) {
                    return nodeRefPlan
                        ? getTrackedNodeAt(nodeRefPlan, index)
                        : nodes[index];
                }
                function ensureTrackedNodeList(nodes) {
                    if (nodes instanceof NodeList) {
                        return new NodeRef(nodes);
                    }
                    return nodes;
                }
                function getTrackedNodeAt(nodes, index) {
                    return nodes instanceof NodeRef
                        ? nodes._getIndex(index)
                        : nodes[index];
                }
                function setTrackedNodeAt(nodes, index, node) {
                    if (nodes instanceof NodeRef) {
                        if (nodes._isList && index !== undefined) {
                            nodes._setIndex(index, node);
                        }
                        else {
                            nodes.node = node;
                        }
                        return;
                    }
                    if (index !== undefined) {
                        nodes[index] = node;
                    }
                }
                function createEmptyAttributes() {
                    return new Attributes($injector, $exceptionHandler);
                }
                /**
                 * Plans a template node list and returns the executor used during linking.
                 */
                function compileTemplate(nodeRefList, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
                    const plan = planTemplate(nodeRefList, transcludeFn, maxPriority, ignoreDirective, previousCompileContext);
                    return plan ? createTemplateLinkExecutor(plan) : null;
                }
                function planTemplate(nodeRefList, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
                    if (!nodeRefList)
                        return null;
                    let nodeRefPlan = null;
                    let templatePlan = null;
                    for (let i = 0, l = getTemplateNodeCount(nodeRefList); i < l; i++) {
                        const templateNode = getPlanningNodeAt(nodeRefList, nodeRefPlan, i);
                        let attrs;
                        let directives;
                        if (templateNode.nodeType === NodeType._ELEMENT_NODE) {
                            const elementDirectives = [];
                            attrs = collectElementDirectiveMatches(templateNode, attrs, elementDirectives, i === 0 ? maxPriority : undefined, ignoreDirective);
                            directives = finalizeDirectiveMatches(elementDirectives);
                        }
                        else {
                            directives = collectDirectiveMatches(templateNode, undefined, i === 0 ? maxPriority : undefined, ignoreDirective);
                        }
                        let nodeLinkPlan = null;
                        if (directives.length) {
                            attrs = attrs || createEmptyAttributes();
                            if (directivesNeedNodeListTracking(directives)) {
                                nodeRefPlan = nodeRefPlan || ensureTrackedNodeList(nodeRefList);
                            }
                            nodeLinkPlan = applyDirectivesToNode(directives, templateNode, attrs, transcludeFn, null, undefined, undefined, createNodePreviousCompileContext(previousCompileContext, i, nodeRefPlan));
                        }
                        const childLinkExecutor = planChildLinkExecutor(templateNode, nodeRefPlan, i, nodeLinkPlan || undefined, transcludeFn);
                        if (nodeLinkPlan || childLinkExecutor) {
                            templatePlan =
                                templatePlan ||
                                    createTemplateLinkPlan(nodeRefPlan, transcludeFn);
                            appendTemplateNodePlan(templatePlan, i, nodeRefPlan, nodeLinkPlan, childLinkExecutor);
                        }
                        // use the previous context only for the first element in the virtual group
                        previousCompileContext = null;
                    }
                    return templatePlan;
                }
                function createTemplateLinkPlan(nodeRefList, transcludeFn) {
                    return {
                        _nodeIndices: [],
                        _nodeLinkPlans: [],
                        _childLinkExecutors: [],
                        _nodeRefList: nodeRefList,
                        _transcludeFn: transcludeFn,
                    };
                }
                function createNodePreviousCompileContext(previousCompileContext, index, templateNodeRef) {
                    const context = previousCompileContext
                        ? assign({}, previousCompileContext, { _index: index })
                        : { _index: index };
                    if (!templateNodeRef) {
                        context._parentNodeRef = undefined;
                        context._ctxNodeRef = undefined;
                        return context;
                    }
                    context._parentNodeRef = templateNodeRef;
                    context._ctxNodeRef = templateNodeRef;
                    return context;
                }
                function directivesNeedNodeListTracking(directives) {
                    for (let i = 0, l = directives.length; i < l; i++) {
                        const directive = directives[i];
                        if (directive.template ||
                            directive.templateUrl ||
                            directive.transclude) {
                            return true;
                        }
                    }
                    return false;
                }
                function appendTemplateNodePlan(templatePlan, index, nodeRefPlan, nodeLinkPlan, childLinkExecutor) {
                    templatePlan._nodeRefList = nodeRefPlan;
                    templatePlan._nodeIndices.push(index);
                    templatePlan._nodeLinkPlans.push(nodeLinkPlan);
                    templatePlan._childLinkExecutors.push(childLinkExecutor);
                }
                function planChildLinkExecutor(templateNode, templateNodeRef, index, nodeLinkPlan, transcludeFn) {
                    if (nodeLinkPlan?._terminal) {
                        return null;
                    }
                    const childParentNode = templateNodeRef
                        ? getTrackedNodeAt(templateNodeRef, index)
                        : templateNode;
                    const { childNodes } = childParentNode;
                    if (!childNodes?.length) {
                        return null;
                    }
                    const childTranscludeFn = nodeLinkPlan
                        ? nodeLinkPlan._transcludeOnThisElement ||
                            !nodeLinkPlan._templateOnThisElement
                            ? nodeLinkPlan._transclude
                            : undefined
                        : transcludeFn;
                    return compileTemplate(childNodes, childTranscludeFn || undefined, undefined, undefined, undefined);
                }
                function createTemplateLinkExecutor(templatePlan) {
                    if (templatePlan._nodeIndices.length === 1) {
                        const index = templatePlan._nodeIndices[0];
                        const nodeLinkPlan = templatePlan._nodeLinkPlans[0];
                        const childLinkExecutor = templatePlan._childLinkExecutors[0];
                        return function singleTemplateLinkExecutor(scope, nodeRef, _parentBoundTranscludeFn) {
                            executeTemplateLinkMapping(templatePlan, nodeLinkPlan, childLinkExecutor, getTemplateNodeAt(nodeRef, index), scope, _parentBoundTranscludeFn || null);
                        };
                    }
                    return function templateLinkExecutor(scope, nodeRef, _parentBoundTranscludeFn) {
                        executeTemplateLinkPlan(templatePlan, scope, nodeRef, _parentBoundTranscludeFn);
                    };
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
                        return invokeBoundTransclude(assertDefined(boundTranscludeFn._state), transcludedScope, cloneFn, controllers, _futureParentElement, containingScope);
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
                function collectDirectiveMatches(node, attrs, maxPriority, ignoreDirective) {
                    let directives;
                    switch (node.nodeType) {
                        case NodeType._ELEMENT_NODE /* Element */: {
                            const elementDirectives = [];
                            collectElementDirectiveMatches(node, attrs, elementDirectives, maxPriority, ignoreDirective);
                            directives = finalizeDirectiveMatches(elementDirectives);
                            break;
                        }
                        case NodeType._TEXT_NODE:
                            {
                                const textDirective = createTextInterpolateDirective(node.nodeValue ?? "");
                                if (textDirective) {
                                    directives = [textDirective];
                                }
                            }
                            break;
                    }
                    return directives || EMPTY_DIRECTIVE_MATCHES;
                }
                function finalizeDirectiveMatches(directives) {
                    if (!directives.length) {
                        return EMPTY_DIRECTIVE_MATCHES;
                    }
                    if (directives.length > 1) {
                        directives.sort(byPriority);
                    }
                    return directives;
                }
                function collectElementDirectiveMatches(node, attrs, directives, maxPriority, ignoreDirective) {
                    const nodeName = getNodeName(node);
                    const normalizedNodeName = normalizeDirectiveName(nodeName);
                    if (ignoreDirective !== normalizedNodeName) {
                        appendDirectivesForName(directives, normalizedNodeName, "E", maxPriority);
                    }
                    const nodeAttributes = node.attributes;
                    if (nodeAttributes.length) {
                        attrs = attrs || createEmptyAttributes();
                        collectAttributeDirectiveMatches(node, attrs, directives, nodeAttributes, maxPriority, ignoreDirective);
                    }
                    if (nodeName === "input" && node.getAttribute("type") === "hidden") {
                        // Hidden input elements can have strange behaviour when navigating back to the page.
                        node.setAttribute("autocomplete", "off");
                    }
                    return attrs;
                }
                function collectAttributeDirectiveMatches(node, attrs, directives, nodeAttributes, maxPriority, ignoreDirective) {
                    for (let j = 0, nodeAttributesLength = nodeAttributes.length; j < nodeAttributesLength; j++) {
                        collectAttributeDirectiveMatch(node, attrs, directives, nodeAttributes[j], maxPriority, ignoreDirective);
                    }
                }
                function collectAttributeDirectiveMatch(node, attrs, directives, attr, maxPriority, ignoreDirective) {
                    let { name } = attr;
                    const { value } = attr;
                    let nName = normalizeDirectiveName(name.toLowerCase());
                    const attrsMap = attrs.$attr;
                    const ngPrefixMatch = nName.charCodeAt(0) === LOWERCASE_N_CHAR_CODE &&
                        nName.charCodeAt(1) === LOWERCASE_G_CHAR_CODE
                        ? NG_PREFIX_BINDING.exec(nName)
                        : null;
                    let isNgAttr = false;
                    if (ngPrefixMatch) {
                        const prefix = ngPrefixMatch[1];
                        isNgAttr = prefix === "Attr";
                        name = name
                            .replace(PREFIX_REGEXP, "")
                            .toLowerCase()
                            .substring(4 + prefix.length)
                            .replace(/_(.)/g, (_match, letter) => uppercase(letter));
                        if (prefix === "Prop" || prefix === "On" || prefix === "Window") {
                            attrs[nName] = value;
                            attrsMap[nName] = attr.name;
                            addSpecialAttributeDirective(node, directives, nName, name, prefix);
                            return;
                        }
                        if (prefix === "Observe") {
                            directives.push(createSyntheticDirective(ngObserveDirective(name, value)));
                            return;
                        }
                        // Update nName for cases where a prefix was removed.
                        nName = normalizeDirectiveName(name.toLowerCase());
                    }
                    attrsMap[nName] = name;
                    if (isNgAttr || !hasOwn(attrs, nName)) {
                        attrs[nName] = value;
                        if (getBooleanAttrName(node, nName)) {
                            attrs[nName] = true;
                        }
                    }
                    addAttrInterpolateDirective(node, directives, value, nName, isNgAttr);
                    if (nName !== ignoreDirective) {
                        appendDirectivesForName(directives, nName, "A", maxPriority);
                    }
                }
                function addSpecialAttributeDirective(node, directives, normalizedName, propertyName, prefix) {
                    if (prefix === "Prop") {
                        addPropertyDirective(node, directives, normalizedName, propertyName);
                        return;
                    }
                    if (prefix === "On") {
                        directives.push(createSyntheticDirective(createEventDirective($parse, $exceptionHandler, normalizedName, propertyName)));
                        return;
                    }
                    directives.push(createSyntheticDirective(createWindowEventDirective($parse, $exceptionHandler, window, normalizedName, propertyName)));
                }
                /**
                 * A function generator that is used to support both eager and lazy compilation
                 * linking function.
                 */
                function compilationGenerator(eager, nodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext) {
                    if (eager) {
                        return compile(nodes, transcludeFn, maxPriority, ignoreDirective, previousCompileContext);
                    }
                    return createLazyCompilationFn({
                        _nodes: nodes,
                        _transcludeFn: transcludeFn,
                        _maxPriority: maxPriority,
                        _ignoreDirective: ignoreDirective,
                        _previousCompileContext: previousCompileContext,
                    });
                }
                function createLazyCompilationFn(lazyCompilationState) {
                    /** Defers compilation until the returned linker/transclude function is first invoked. */
                    const lazyCompilation = function lazyCompilation(...args) {
                        return invokeLazyCompilation(assertDefined(lazyCompilation._state), ...args);
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
                    if (linkFnRecord._linkCtx !== undefined) {
                        return linkFnRecord._fn(linkFnRecord._linkCtx, linkFnRecord._isolateScope ? isolateScope : scope, node, attrs, controllers, transcludeFn);
                    }
                    if (linkFnRecord._thisArg !== undefined) {
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
                    handleTextInterpolationWatch(bindingState);
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
                    if (linkState._name === "srcset") {
                        attr.$set(linkState._name, linkState._isNgAttr
                            ? value
                            : sanitizeSrcset(security.valueOf(value), "srcset"));
                        return;
                    }
                    if ((linkState._trustedContext === SCE_CONTEXTS._URL ||
                        linkState._trustedContext === SCE_CONTEXTS._MEDIA_URL) &&
                        !(typeof value === "string" && value.startsWith("unsafe:"))) {
                        value = security.getTrusted(linkState._trustedContext, value);
                    }
                    attr.$set(linkState._name, value);
                }
                /** Re-applies the current interpolated attribute value from explicit per-link state. */
                function handleAttrInterpolationWatch(bindingState) {
                    const interpolateFn = bindingState._linkState._interpolateFn;
                    if (!interpolateFn) {
                        return;
                    }
                    const value = interpolateFn(bindingState._scope);
                    if (bindingState._lastValue === value &&
                        "$index" in bindingState._scope.$target) {
                        return;
                    }
                    bindingState._lastValue = value;
                    applyInterpolatedAttrValue(bindingState._linkState, bindingState._attr, value);
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
                    security.valueOf(value);
                    updatePropertyDirectiveValue(bindingState);
                }
                /** Invokes an expression binding against the stored parent getter and scope target. */
                function invokeExpressionBinding(bindingState, locals) {
                    return bindingState._parentGet?.(bindingState._scopeTarget, locals);
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
                    const afterTemplateNodeLinkPlan = delayedState._afterTemplateNodeLinkPlan;
                    if (!afterTemplateNodeLinkPlan) {
                        return;
                    }
                    let childBoundTranscludeFn = boundTranscludeFn;
                    if (afterTemplateNodeLinkPlan._transcludeOnThisElement) {
                        childBoundTranscludeFn = createBoundTranscludeFn(scope, afterTemplateNodeLinkPlan._transclude, boundTranscludeFn);
                    }
                    if (afterTemplateNodeLinkPlan._nodeLinkFnState !== undefined) {
                        afterTemplateNodeLinkPlan._nodeLinkFn(afterTemplateNodeLinkPlan._nodeLinkFnState, delayedState._afterTemplateChildLinkExecutor, scope, node, childBoundTranscludeFn || null);
                    }
                    else {
                        afterTemplateNodeLinkPlan._nodeLinkFn(delayedState._afterTemplateChildLinkExecutor, scope, node, childBoundTranscludeFn || null);
                    }
                }
                /**
                 * Replays one queued link request after an async templateUrl has resolved.
                 * Queued requests may need clone/class reconciliation because the template DOM did not
                 * exist at the time the original link request was recorded.
                 */
                function replayResolvedTemplateNodeLink(delayedState, scope, beforeTemplateLinkNode, boundTranscludeFn) {
                    const afterTemplateNodeLinkPlan = delayedState._afterTemplateNodeLinkPlan;
                    const compiledNode = delayedState._compiledNode;
                    const compileNodeRef = delayedState._compileNodeRef;
                    if (!afterTemplateNodeLinkPlan || !compiledNode || !compileNodeRef) {
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
                                const { classList } = compileNodeRef.element;
                                const targetClassList = beforeTemplateLinkNode
                                    .classList;
                                for (let i = 0, l = classList.length; i < l; i++) {
                                    targetClassList.add(classList[i]);
                                }
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
                function removeDelayedTemplateLinkQueueEntry(delayedState, scope, node, boundTranscludeFn) {
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
                function executeDelayedTemplateNodeLinkPlan(delayedState, _ignoreChildLinkFn, scope, node, boundTranscludeFn) {
                    if (scope._destroyed) {
                        return;
                    }
                    if (delayedState._linkQueue) {
                        enqueuePendingTemplateLink(delayedState, scope, node, boundTranscludeFn);
                        return;
                    }
                    invokeResolvedTemplateNodeLink(delayedState, scope, node, boundTranscludeFn);
                }
                function enqueuePendingTemplateLink(delayedState, scope, node, boundTranscludeFn) {
                    assertDefined(delayedState._linkQueue).push(scope, node, boundTranscludeFn);
                    const removeOnDestroy = scope.$on("$destroy", () => {
                        removeOnDestroy();
                        removeDelayedTemplateLinkQueueEntry(delayedState, scope, node, boundTranscludeFn);
                    });
                }
                function releaseDelayedTemplateLinkState(delayedState) {
                    delayedState._compileNodeRef?._release();
                    delayedState._compileNodeRef = undefined;
                    delayedState._linkQueue = null;
                }
                function replayPendingTemplateLinks(delayedState) {
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
                        else if (typeof content === "string") {
                            templateNodes = collectElementTemplateNodes(createNodelistFromHTML(content));
                        }
                        else {
                            templateNodes = collectElementTemplateNodes(wrapTemplate(delayedState._templateNamespace, trim(content)));
                        }
                        compileNode = templateNodes[0];
                        if (templateNodes.length !== 1 ||
                            compileNode.nodeType !== NodeType._ELEMENT_NODE) {
                            throw $compileError("tplrt", "Template for directive '{0}' must have exactly one root element. {1}", delayedState._origAsyncDirective.name, delayedState._templateUrl);
                        }
                        replacementState = {
                            _templateNodes: templateNodes,
                            _templateAttrs: { $attr: {} },
                        };
                        const delayedCompileNodeRef = assertDefined(delayedState._compileNodeRef);
                        replaceWith(delayedCompileNodeRef._getAny(), compileNode, delayedState._previousCompileContext._index);
                        delayedCompileNodeRef.node = compileNode;
                        delayedState._tAttrs._node = compileNode;
                        delayedState._tAttrs._nodeRefCache = delayedCompileNodeRef;
                        const templateDirectives = collectDirectiveMatches(compileNode, replacementState._templateAttrs);
                        if (delayedState._origAsyncDirective.scope !== null &&
                            typeof delayedState._origAsyncDirective.scope === "object") {
                            markDirectiveScope(templateDirectives, true);
                        }
                        delayedState._directives = templateDirectives.concat(delayedState._directives);
                        mergeTemplateAttributes(delayedState._tAttrs, replacementState._templateAttrs);
                    }
                    else {
                        compileNode = delayedState._beforeTemplateCompileNode;
                        assertDefined(delayedState._compileNodeRef).element.innerHTML =
                            content;
                    }
                    delayedState._directives.unshift(delayedState._derivedSyncDirective);
                    delayedState._afterTemplateNodeLinkPlan = applyDirectivesToNode(delayedState._directives, compileNode, delayedState._tAttrs, delayedState._childTranscludeFn, delayedState._origAsyncDirective, delayedState._preLinkFns, delayedState._postLinkFns, {
                        ...delayedState._previousCompileContext,
                        _ctxNodeRef: delayedState._compileNodeRef,
                    });
                    if (delayedState._rootElement) {
                        for (let i = 0, l = delayedState._rootElement.length; i < l; i++) {
                            const node = delayedState._rootElement[i];
                            if (node.element === compileNode) {
                                delayedState._rootElement[i] = assertDefined(delayedState._compileNodeRef);
                            }
                        }
                    }
                    delayedState._compiledNode = compileNode;
                    delayedState._afterTemplateChildLinkExecutor = compileTemplate(assertDefined(delayedState._compileNodeRef)._getAny().childNodes, delayedState._childTranscludeFn, undefined, undefined, undefined);
                    try {
                        replayPendingTemplateLinks(delayedState);
                    }
                    finally {
                        releaseDelayedTemplateLinkState(delayedState);
                    }
                }
                function handleDelayedTemplateLoadError(delayedState, error) {
                    delayedState._afterTemplateNodeLinkPlan = undefined;
                    delayedState._afterTemplateChildLinkExecutor = null;
                    delayedState._compiledNode = undefined;
                    releaseDelayedTemplateLinkState(delayedState);
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
                            ? transcludeState._elementNode.parentElement
                            : transcludeState._elementNode);
                    if (requestedSlotName) {
                        const slotTranscludeFn = boundTranscludeFn._slots[requestedSlotName];
                        if (slotTranscludeFn) {
                            return slotTranscludeFn(transcludedScope, attachFn, transcludeControllers, futureParentElement, transcludeState._scopeToChild);
                        }
                        if (slotTranscludeFn === undefined) {
                            throw $compileError("noslot", 'No parent directive that requires a transclusion with slot name "{0}". ' +
                                "Element: {1}", requestedSlotName, startingTag(transcludeState._elementNode));
                        }
                        return undefined;
                    }
                    return boundTranscludeFn(transcludedScope, attachFn, transcludeControllers, futureParentElement, transcludeState._scopeToChild);
                }
                function createControllersBoundTranscludeFn(transcludeState) {
                    const wrapper = function wrapper(scopeParam, cloneAttachFn, _futureParentElement, slotName) {
                        return invokeControllersBoundTransclude(assertDefined(wrapper._state), scopeParam, cloneAttachFn, _futureParentElement, slotName);
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
                function executeStoredNodeLinkPlan(nodeLinkState, childLinkExecutor, scope, linkNode, boundTranscludeFn) {
                    let isolateScope;
                    let controllerScope;
                    let elementControllers = nullObject();
                    let scopeToChild = scope;
                    const elementNode = linkNode;
                    let scopeBindingInfo;
                    const attrs = nodeLinkState._compileNode === linkNode
                        ? nodeLinkState._templateAttrs
                        : new Attributes($injector, $exceptionHandler, elementNode, nodeLinkState._templateAttrs);
                    const element = elementNode.nodeType === NodeType._ELEMENT_NODE
                        ? elementNode
                        : undefined;
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
                            _elementNode: elementNode,
                        };
                        const currentTranscludeState = transcludeState;
                        scope.$on("$destroy", () => {
                            releaseControllersBoundTranscludeState(currentTranscludeState);
                        });
                        transcludeFn = createControllersBoundTranscludeFn(transcludeState);
                    }
                    const controllerDirectives = nodeLinkState._controllerDirectives || nullObject();
                    if (nodeLinkState._controllerDirectives) {
                        elementControllers = setupControllers(elementNode, attrs, transcludeFn, nodeLinkState._controllerDirectives, isolateScope || scope, scope, nodeLinkState._newIsolateScopeDirective);
                        if (transcludeState) {
                            syncControllersBoundTranscludeState(transcludeState, scopeToChild, elementControllers, elementNode);
                        }
                    }
                    if (nodeLinkState._newIsolateScopeDirective && isolateScope) {
                        isolateScope.$target._isolateBindings =
                            nodeLinkState._newIsolateScopeDirective._isolateBindings;
                        scopeBindingInfo = initializeDirectiveBindings(scope, attrs, isolateScope, isolateScope.$target
                            ._isolateBindings, nodeLinkState._newIsolateScopeDirective);
                        if (scopeBindingInfo._removeWatches) {
                            isolateScope.$on("$destroy", scopeBindingInfo._removeWatches);
                        }
                    }
                    for (const name in elementControllers) {
                        const controllerDirective = controllerDirectives[name];
                        const controller = elementControllers[name];
                        const bindings = controllerDirective._bindings._bindToController;
                        const controllerInstance = controller();
                        controller._instance = controllerScope.$new(controllerInstance);
                        setCacheData(elementNode, `$${controllerDirective.name}Controller`, controller._instance);
                        controller._bindingInfo = initializeDirectiveBindings(controllerScope, attrs, controller._instance, bindings, controllerDirective);
                    }
                    if (nodeLinkState._controllerDirectives) {
                        for (const name in controllerDirectives) {
                            const controllerDirective = controllerDirectives[name];
                            const { require } = controllerDirective;
                            if (controllerDirective.bindToController &&
                                !Array.isArray(require) &&
                                require !== null &&
                                typeof require === "object") {
                                extend(elementControllers[name]._instance, getControllers(name, require, element, elementControllers));
                            }
                        }
                    }
                    if (elementControllers) {
                        for (const name in elementControllers) {
                            const controller = elementControllers[name];
                            const controllerInstance = controller._instance;
                            if (isFunction(controllerInstance.$onChanges)) {
                                try {
                                    callFunction(controllerInstance.$onChanges, controllerInstance, assertDefined(controller._bindingInfo)._initialChanges);
                                }
                                catch (err) {
                                    $exceptionHandler(err);
                                }
                            }
                            if (isFunction(controllerInstance.$onInit)) {
                                try {
                                    const controllerTarget = controllerInstance.$target ?? controllerInstance;
                                    callFunction(controllerTarget.$onInit, controllerTarget);
                                }
                                catch (err) {
                                    $exceptionHandler(err);
                                }
                            }
                            if (isFunction(controllerInstance.$onDestroy)) {
                                controllerScope.$on("$destroy", () => {
                                    callFunction(assertDefined(controllerInstance.$onDestroy), controllerInstance);
                                });
                            }
                            controllerScope.$on("$destroy", () => {
                                if (!controllerInstance._destroyed &&
                                    isFunction(controllerInstance.$destroy)) {
                                    callFunction(controllerInstance.$destroy, controllerInstance);
                                }
                            });
                        }
                    }
                    for (let i = 0, ii = nodeLinkState._preLinkFns.length; i < ii; i++) {
                        const preLinkFn = nodeLinkState._preLinkFns[i];
                        const controllers = preLinkFn._require &&
                            getControllers(preLinkFn._directiveName, preLinkFn._require, element, elementControllers);
                        try {
                            invokeLinkFnRecord(preLinkFn, isolateScope, scope, elementNode, attrs, controllers, transcludeFn);
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
                            syncControllersBoundTranscludeState(transcludeState, scopeToChild, elementControllers, elementNode);
                        }
                    }
                    if (childLinkExecutor && linkNode.childNodes?.length) {
                        childLinkExecutor(scopeToChild, linkNode.childNodes, boundTranscludeFn);
                    }
                    for (let i = nodeLinkState._postLinkFns.length - 1; i >= 0; i--) {
                        const postLinkFn = nodeLinkState._postLinkFns[i];
                        const controllers = postLinkFn._require &&
                            getControllers(postLinkFn._directiveName, postLinkFn._require, elementNode, elementControllers);
                        try {
                            if (postLinkFn._isolateScope && isolateScope) {
                                deleteCacheData(element, _scope);
                                setIsolateScope(element, isolateScope);
                            }
                            invokeLinkFnRecord(postLinkFn, isolateScope, scope, elementNode, attrs, controllers, transcludeFn);
                        }
                        catch (err) {
                            $exceptionHandler(err);
                        }
                    }
                    if (elementControllers) {
                        for (const name in elementControllers) {
                            const controller = elementControllers[name];
                            const controllerInstance = controller._instance;
                            if (isFunction(controllerInstance.$postLink)) {
                                callFunction(controllerInstance.$postLink, controllerInstance);
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
                    let terminalPriority = -Number.MAX_VALUE;
                    let terminal = false;
                    let { _templateDirective, _nonTlbTranscludeDirective, _hasElementTranscludeDirective, } = previousCompileContext;
                    const { _ctxNodeRef, _parentNodeRef } = previousCompileContext;
                    let hasTranscludeDirective = false;
                    let hasTemplate = false;
                    let compileNodeRef;
                    const { _index } = previousCompileContext;
                    templateAttrs._node = compileNode;
                    templateAttrs._nodeRefCache = undefined;
                    const ensureCompileNodeRef = () => {
                        if (!compileNodeRef) {
                            compileNodeRef = NodeRef._fromNode(compileNode);
                            templateAttrs._nodeRefCache = compileNodeRef;
                        }
                        return compileNodeRef;
                    };
                    let directive;
                    let directiveName;
                    let replaceDirective = originalReplaceDirective;
                    let childTranscludeFn = transcludeFn;
                    const directiveEffectState = {
                        _newScopeDirective: previousCompileContext._newScopeDirective,
                        _controllerDirectives: previousCompileContext._controllerDirectives,
                        _newIsolateScopeDirective: previousCompileContext._newIsolateScopeDirective,
                        _didScanForMultipleTransclusion: false,
                        _mightHaveMultipleTransclusionError: false,
                    };
                    let directiveValue;
                    let nodeLinkFn;
                    let nodeLinkFnState;
                    // executes all directives on the current element
                    for (let i = 0, ii = directives.length; i < ii; i++) {
                        directive = directives[i];
                        const directivePriority = directive.priority;
                        if (terminalPriority > directivePriority) {
                            break; // prevent further processing of directives
                        }
                        directiveName = directive.name || "";
                        applyDirectiveScopeEffect(directive, compileNode, directiveEffectState);
                        applyMultipleTransclusionScanEffect(directives, i, directive, directiveName, directiveEffectState);
                        applyDirectiveControllerEffect(directive, directiveName, compileNode, directiveEffectState);
                        directiveValue = directive.transclude;
                        if (directiveValue) {
                            const transclusionResult = applyTransclusionDirective(directive, directiveName, directiveValue, directiveValue === "element"
                                ? ensureCompileNodeRef()
                                : compileNodeRef, compileNode, templateAttrs, _ctxNodeRef, _index, transcludeFn, directivePriority, replaceDirective, _nonTlbTranscludeDirective, !!_hasElementTranscludeDirective, terminalPriority, directiveEffectState._mightHaveMultipleTransclusionError, previousCompileContext);
                            ({
                                _childTranscludeFn: childTranscludeFn,
                                _compileNode: compileNode,
                                _compileNodeRef: compileNodeRef,
                                _hasElementTranscludeDirective,
                                _hasTranscludeDirective: hasTranscludeDirective,
                                _nonTlbTranscludeDirective,
                                _terminalPriority: terminalPriority,
                            } = transclusionResult);
                        }
                        if (directive.template) {
                            hasTemplate = true;
                            const inlineTemplate = applyInlineTemplateDirective(directive, directiveName, ensureCompileNodeRef(), compileNode, templateAttrs, directives, i, _parentNodeRef, _index, directiveEffectState._newIsolateScopeDirective, directiveEffectState._newScopeDirective, _templateDirective, replaceDirective);
                            ({
                                _compileNode: compileNode,
                                _directiveCount: ii,
                                _directives: directives,
                                _replaceDirective: replaceDirective,
                                _templateDirective,
                            } = inlineTemplate);
                            templateAttrs._node = compileNode;
                        }
                        if (directive.templateUrl) {
                            hasTemplate = true;
                            preLinkFns = preLinkFns || [];
                            postLinkFns = postLinkFns || [];
                            const templateUrlResult = applyTemplateUrlDirective(directives, i, directive, ensureCompileNodeRef(), templateAttrs, compileNode, hasTranscludeDirective, childTranscludeFn, preLinkFns, postLinkFns, _index, directiveEffectState._controllerDirectives, directiveEffectState._newScopeDirective, directiveEffectState._newIsolateScopeDirective, _templateDirective, _nonTlbTranscludeDirective, replaceDirective, previousCompileContext);
                            ({
                                _directiveCount: ii,
                                _nodeLinkFn: nodeLinkFn,
                                _nodeLinkFnState: nodeLinkFnState,
                                _replaceDirective: replaceDirective,
                                _templateDirective,
                            } = templateUrlResult);
                        }
                        else if (directive.compile) {
                            preLinkFns = preLinkFns || [];
                            postLinkFns = postLinkFns || [];
                            collectDirectiveLinkFns(directive, directiveName, compileNode, templateAttrs, childTranscludeFn, preLinkFns, postLinkFns, directiveEffectState._newIsolateScopeDirective);
                        }
                        if (directive.terminal) {
                            terminal = true;
                            if (terminalPriority < directivePriority) {
                                terminalPriority = directivePriority;
                            }
                        }
                    }
                    previousCompileContext._hasElementTranscludeDirective =
                        _hasElementTranscludeDirective;
                    if (!nodeLinkFn) {
                        nodeLinkFn = executeStoredNodeLinkPlan;
                        nodeLinkFnState = createStoredNodeLinkState(compileNode, templateAttrs, childTranscludeFn, directiveEffectState._controllerDirectives, directiveEffectState._newIsolateScopeDirective, directiveEffectState._newScopeDirective, !!_hasElementTranscludeDirective, preLinkFns || EMPTY_LINK_FN_RECORDS, postLinkFns || EMPTY_LINK_FN_RECORDS);
                    }
                    // might be normal or delayed nodeLinkFn depending on if templateUrl is present
                    return createNodeLinkPlan(nodeLinkFn, nodeLinkFnState, terminal, childTranscludeFn, hasTranscludeDirective, hasTemplate, directiveEffectState._newScopeDirective);
                }
                function applyTransclusionDirective(directive, directiveName, directiveValue, compileNodeRef, compileNode, templateAttrs, contextNodeRef, index, transcludeFn, directivePriority, replaceDirective, nonTlbTranscludeDirective, hasElementTranscludeDirective, terminalPriority, mightHaveMultipleTransclusionError, previousCompileContext) {
                    const nextNonTlbTranscludeDirective = applyDirectiveTransclusionOwnershipEffect(directive, directiveName, compileNode, nonTlbTranscludeDirective);
                    if (directiveValue === "element") {
                        const elementTransclusion = applyElementTransclusionDirective(assertDefined(compileNodeRef), templateAttrs, contextNodeRef, index, transcludeFn, directivePriority, replaceDirective, nextNonTlbTranscludeDirective, mightHaveMultipleTransclusionError);
                        return {
                            _compileNode: elementTransclusion._compileNode,
                            _compileNodeRef: elementTransclusion._compileNodeRef,
                            _childTranscludeFn: elementTransclusion._childTranscludeFn,
                            _hasTranscludeDirective: true,
                            _hasElementTranscludeDirective: true,
                            _nonTlbTranscludeDirective: nextNonTlbTranscludeDirective,
                            _terminalPriority: elementTransclusion._terminalPriority,
                        };
                    }
                    const childTranscludeFn = applyContentTransclusionDirective(directive, directiveValue, compileNode, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext);
                    return {
                        _compileNode: compileNode,
                        _compileNodeRef: compileNodeRef,
                        _childTranscludeFn: childTranscludeFn,
                        _hasTranscludeDirective: true,
                        _hasElementTranscludeDirective: hasElementTranscludeDirective,
                        _nonTlbTranscludeDirective: nextNonTlbTranscludeDirective,
                        _terminalPriority: terminalPriority,
                    };
                }
                function applyInlineTemplateDirective(directive, directiveName, compileNodeRef, compileNode, templateAttrs, directives, directiveIndex, parentNodeRef, index, newIsolateScopeDirective, newScopeDirective, templateDirective, replaceDirective) {
                    assertNoDuplicate("template", templateDirective, directive, compileNode);
                    const directiveValue = resolveDirectiveTemplateValue(directive, compileNode, templateAttrs);
                    if (!directive.replace) {
                        if (compileNode.nodeType === NodeType._ELEMENT_NODE) {
                            compileNode.innerHTML = directiveValue;
                        }
                        return {
                            _compileNode: compileNode,
                            _directives: directives,
                            _directiveCount: directives.length,
                            _templateDirective: directive,
                            _replaceDirective: replaceDirective,
                        };
                    }
                    const templateNodes = createDirectiveTemplateNodes(directive, directiveValue);
                    const replacementNode = getSingleElementTemplateRoot(templateNodes, directiveName);
                    const templateReplacement = applyTemplateReplacementDirective(compileNodeRef, replacementNode, templateAttrs, directives, directiveIndex, parentNodeRef, index, newIsolateScopeDirective, newScopeDirective);
                    return {
                        _compileNode: replacementNode,
                        _directives: templateReplacement._directives,
                        _directiveCount: templateReplacement._directiveCount,
                        _templateDirective: directive,
                        _replaceDirective: directive,
                    };
                }
                function applyTemplateReplacementDirective(compileNodeRef, compileNode, templateAttrs, directives, directiveIndex, parentNodeRef, index, newIsolateScopeDirective, newScopeDirective) {
                    replaceWith(compileNodeRef._getAny(), compileNode);
                    compileNodeRef.node = compileNode;
                    templateAttrs._node = compileNode;
                    templateAttrs._nodeRefCache = compileNodeRef;
                    if (parentNodeRef) {
                        setTrackedNodeAt(parentNodeRef, index, compileNode);
                    }
                    const newTemplateAttrs = { $attr: {} };
                    const templateDirectives = collectDirectiveMatches(compileNode, newTemplateAttrs);
                    const unprocessedDirectives = directives.splice(directiveIndex + 1, directives.length - (directiveIndex + 1));
                    if (newIsolateScopeDirective || newScopeDirective) {
                        markDirectiveScope(templateDirectives, newIsolateScopeDirective, newScopeDirective);
                    }
                    const mergedDirectives = mergeDirectiveLists(directives, templateDirectives, unprocessedDirectives);
                    mergeTemplateAttributes(templateAttrs, newTemplateAttrs);
                    return {
                        _directives: mergedDirectives,
                        _directiveCount: mergedDirectives.length,
                    };
                }
                function mergeDirectiveLists(first, second, third) {
                    const merged = first.slice();
                    for (let i = 0, l = second.length; i < l; i++) {
                        merged.push(second[i]);
                    }
                    for (let i = 0, l = third.length; i < l; i++) {
                        merged.push(third[i]);
                    }
                    return merged;
                }
                function applyTemplateUrlDirective(directives, directiveIndex, directive, compileNodeRef, templateAttrs, compileNode, hasTranscludeDirective, childTranscludeFn, preLinkFns, postLinkFns, index, controllerDirectives, newScopeDirective, newIsolateScopeDirective, templateDirective, nonTlbTranscludeDirective, replaceDirective, previousCompileContext) {
                    assertNoDuplicate("template", templateDirective, directive, compileNode);
                    const nextTemplateDirective = directive;
                    const nextReplaceDirective = directive.replace
                        ? directive
                        : replaceDirective;
                    const { _nodeLinkFn, _nodeLinkFnState } = compileTemplateUrl(directives.splice(directiveIndex, directives.length - directiveIndex), compileNodeRef, templateAttrs, compileNode, (hasTranscludeDirective &&
                        childTranscludeFn), preLinkFns, postLinkFns, {
                        _index: index,
                        _controllerDirectives: controllerDirectives,
                        _newScopeDirective: newScopeDirective !== directive ? newScopeDirective : undefined,
                        _newIsolateScopeDirective: newIsolateScopeDirective,
                        _templateDirective: nextTemplateDirective,
                        _nonTlbTranscludeDirective: nonTlbTranscludeDirective,
                        _futureParentElement: previousCompileContext._futureParentElement,
                    });
                    return {
                        _nodeLinkFn,
                        _nodeLinkFnState,
                        _templateDirective: nextTemplateDirective,
                        _replaceDirective: nextReplaceDirective,
                        _directiveCount: directives.length,
                    };
                }
                function createStoredNodeLinkState(compileNode, templateAttrs, transcludeFn, controllerDirectives, newIsolateScopeDirective, newScopeDirective, hasElementTranscludeDirective, preLinkFns, postLinkFns) {
                    return {
                        _compileNode: compileNode,
                        _templateAttrs: templateAttrs,
                        _transcludeFn: transcludeFn,
                        _controllerDirectives: controllerDirectives,
                        _newIsolateScopeDirective: newIsolateScopeDirective,
                        _newScopeDirective: newScopeDirective,
                        _hasElementTranscludeDirective: hasElementTranscludeDirective,
                        _preLinkFns: preLinkFns,
                        _postLinkFns: postLinkFns,
                    };
                }
                function createNodeLinkPlan(nodeLinkFn, nodeLinkFnState, terminal, transcludeFn, transcludeOnThisElement, templateOnThisElement, newScopeDirective) {
                    return {
                        _nodeLinkFn: nodeLinkFn,
                        _nodeLinkFnState: nodeLinkFnState,
                        _terminal: terminal,
                        _transclude: transcludeFn,
                        _transcludeOnThisElement: transcludeOnThisElement,
                        _templateOnThisElement: templateOnThisElement,
                        _newScope: newScopeDirective?.scope === true,
                    };
                }
                function applyElementTransclusionDirective(templateNodeRef, templateAttrs, contextNodeRef, index, transcludeFn, directivePriority, replaceDirective, nonTlbTranscludeDirective, mightHaveMultipleTransclusionError) {
                    const transcludedTemplateRef = templateNodeRef;
                    const compileNodeRef = NodeRef._fromNode(document.createComment(""));
                    templateAttrs._nodeRef = compileNodeRef;
                    const compileNode = compileNodeRef.node;
                    const transcludedTemplateElement = assertDefined(transcludedTemplateRef._element);
                    setTranscludedHostElement(compileNode, transcludedTemplateElement);
                    if (contextNodeRef) {
                        setTrackedNodeAt(contextNodeRef, index, compileNode);
                    }
                    replaceWith(transcludedTemplateElement, compileNode, index);
                    const childTranscludeFn = compilationGenerator(mightHaveMultipleTransclusionError, transcludedTemplateElement, transcludeFn, directivePriority, replaceDirective ? replaceDirective.name : undefined, {
                        // Don't pass controller/scope/template directives through element transclusion:
                        // the transcluded template will compile against its own directive context.
                        _nonTlbTranscludeDirective: nonTlbTranscludeDirective,
                    });
                    return {
                        _compileNode: compileNode,
                        _compileNodeRef: compileNodeRef,
                        _childTranscludeFn: childTranscludeFn,
                        _terminalPriority: directivePriority,
                    };
                }
                function applyContentTransclusionDirective(directive, directiveValue, compileNode, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext) {
                    const transclusionContentPlan = createTransclusionContentPlan(directiveValue, compileNode, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext);
                    emptyElement(compileNode);
                    const childTranscludeFn = compilationGenerator(mightHaveMultipleTransclusionError, transclusionContentPlan._nodes, transcludeFn, undefined, undefined, {
                        _needsNewScope: directive._isolateScope || directive._newScope,
                    });
                    childTranscludeFn._slots =
                        transclusionContentPlan._slots;
                    return childTranscludeFn;
                }
                function resolveDirectiveTemplateValue(directive, compileNode, templateAttrs) {
                    const template = isFunction(directive.template)
                        ? directive.template(compileNode, templateAttrs)
                        : directive.template;
                    return denormalizeTemplate(template ?? "");
                }
                function createDirectiveTemplateNodes(directive, template) {
                    if (isTextNode(template)) {
                        return [];
                    }
                    const wrappedTemplate = wrapTemplate(directive.templateNamespace, trim(template));
                    return typeof wrappedTemplate === "string"
                        ? collectElementTemplateNodes(createNodelistFromHTML(wrappedTemplate))
                        : wrappedTemplate;
                }
                function collectElementTemplateNodes(nodes) {
                    const elements = [];
                    for (let i = 0, l = nodes.length; i < l; i++) {
                        const node = nodes[i];
                        if (node.nodeType === NodeType._ELEMENT_NODE) {
                            elements.push(node);
                        }
                    }
                    return elements;
                }
                function getSingleElementTemplateRoot(templateNodes, directiveName) {
                    const compileNode = templateNodes[0];
                    if (templateNodes.length !== 1 ||
                        compileNode.nodeType !== NodeType._ELEMENT_NODE) {
                        throw $compileError("tplrt", "Template for directive '{0}' must have exactly one root element. {1}", directiveName, "");
                    }
                    return compileNode;
                }
                function createTransclusionContentPlan(directiveValue, compileNode, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext) {
                    if (directiveValue === null || typeof directiveValue !== "object") {
                        return {
                            _nodes: cloneChildNodesToTemporaryContainer(compileNode).childNodes,
                            _slots: nullObject(),
                        };
                    }
                    return createSlotTransclusionContentPlan(directiveValue, compileNode, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext);
                }
                function cloneChildNodesToTemporaryContainer(compileNode) {
                    const tempContainer = document.createElement("div");
                    const { childNodes } = compileNode;
                    // Clone each node individually to prevent browser DOM normalization
                    // from merging adjacent text nodes.
                    for (let childIndex = 0, childCount = childNodes.length; childIndex < childCount; childIndex++) {
                        tempContainer.appendChild(childNodes[childIndex].cloneNode(true));
                    }
                    return tempContainer;
                }
                function createSlotTransclusionContentPlan(directiveValue, compileNode, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext) {
                    const tempContainer = document.createElement("div");
                    const slots = nullObject();
                    const slotMap = nullObject();
                    const filledSlots = nullObject();
                    for (const slotName in directiveValue) {
                        if (!hasOwn(directiveValue, slotName)) {
                            continue;
                        }
                        let elementSelector = directiveValue[slotName];
                        const optional = elementSelector.startsWith("?");
                        elementSelector = optional
                            ? elementSelector.substring(1)
                            : elementSelector;
                        slotMap[elementSelector] = slotName;
                        slots[slotName] = null;
                        filledSlots[slotName] = optional;
                    }
                    distributeTransclusionSlots(compileNode, tempContainer, slotMap, slots, filledSlots);
                    assertRequiredTransclusionSlotsFilled(filledSlots);
                    compileFilledTransclusionSlots(slots, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext);
                    return {
                        _nodes: tempContainer.childNodes,
                        _slots: slots,
                    };
                }
                function distributeTransclusionSlots(compileNode, tempContainer, slotMap, slots, filledSlots) {
                    const { childNodes } = compileNode;
                    for (let childIndex = 0, childCount = childNodes.length; childIndex < childCount; childIndex++) {
                        const node = childNodes[childIndex].cloneNode(true);
                        const slotName = node.nodeType === NodeType._ELEMENT_NODE
                            ? slotMap[normalizeDirectiveName(getNodeName(node))]
                            : undefined;
                        if (slotName) {
                            filledSlots[slotName] = true;
                            slots[slotName] = slots[slotName] || createDocumentFragment();
                            slots[slotName].appendChild(node);
                        }
                        else {
                            tempContainer.appendChild(node);
                        }
                    }
                }
                function assertRequiredTransclusionSlotsFilled(filledSlots) {
                    for (const slotName in filledSlots) {
                        if (!hasOwn(filledSlots, slotName)) {
                            continue;
                        }
                        if (!filledSlots[slotName]) {
                            throw $compileError("reqslot", "Required transclusion slot `{0}` was not filled.", slotName);
                        }
                    }
                }
                function compileFilledTransclusionSlots(slots, transcludeFn, mightHaveMultipleTransclusionError, previousCompileContext) {
                    for (const slotName in slots) {
                        const slot = slots[slotName];
                        if (slot) {
                            slots[slotName] = compilationGenerator(mightHaveMultipleTransclusionError, slot.childNodes, transcludeFn, undefined, undefined, previousCompileContext);
                        }
                    }
                }
                function applyDirectiveScopeEffect(directive, compileNode, state) {
                    const directiveScope = directive.scope;
                    if (!directiveScope) {
                        return;
                    }
                    // Async templates are checked when their derived sync directive is compiled.
                    if (!directive.templateUrl) {
                        if (directiveScope !== null && typeof directiveScope === "object") {
                            assertNoDuplicate("new/isolated scope", state._newIsolateScopeDirective || state._newScopeDirective, directive, compileNode);
                            state._newIsolateScopeDirective = directive;
                        }
                        else {
                            assertNoDuplicate("new/isolated scope", state._newIsolateScopeDirective, directive, compileNode);
                        }
                    }
                    state._newScopeDirective = state._newScopeDirective || directive;
                }
                function applyMultipleTransclusionScanEffect(directives, directiveIndex, directive, directiveName, state) {
                    if (state._didScanForMultipleTransclusion ||
                        !shouldScanForMultipleTransclusion(directive, directiveName)) {
                        return;
                    }
                    state._mightHaveMultipleTransclusionError =
                        hasRemainingTransclusionConflict(directives, directiveIndex + 1);
                    state._didScanForMultipleTransclusion = true;
                }
                function applyDirectiveTransclusionOwnershipEffect(directive, directiveName, compileNode, nonTlbTranscludeDirective) {
                    // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
                    // This option should only be used by directives that know how to safely handle element transclusion,
                    // where the transcluded nodes are added or replaced after linking.
                    if (isExcludedTransclusionDirective(directiveName)) {
                        return nonTlbTranscludeDirective;
                    }
                    assertNoDuplicate("transclusion", nonTlbTranscludeDirective, directive, compileNode);
                    return directive;
                }
                function isExcludedTransclusionDirective(directiveName) {
                    return directiveName === "ngIf" || directiveName === "ngRepeat";
                }
                function isAllOrNothingAttr(name) {
                    return (name === "ngSrc" ||
                        name === "ngSrcset" ||
                        name === "src" ||
                        name === "srcset");
                }
                function createSyntheticDirective(directive) {
                    const internalDirective = directive;
                    internalDirective.priority = internalDirective.priority || 0;
                    internalDirective.index = internalDirective.index || 0;
                    return internalDirective;
                }
                function shouldScanForMultipleTransclusion(directive, directiveName) {
                    const hasReplacedTemplate = directive.replace && (directive.templateUrl || directive.template);
                    const shouldTransclude = directive.transclude &&
                        !isExcludedTransclusionDirective(directiveName);
                    return !!(hasReplacedTemplate || shouldTransclude);
                }
                function hasRemainingTransclusionConflict(directives, startIndex) {
                    for (let i = startIndex, directive;;) {
                        directive = directives[i++];
                        if (!directive) {
                            return false;
                        }
                        if ((directive.transclude &&
                            !isExcludedTransclusionDirective(directive.name || "")) ||
                            (directive.replace &&
                                (directive.templateUrl || directive.template))) {
                            return true;
                        }
                    }
                }
                function applyDirectiveControllerEffect(directive, directiveName, compileNode, state) {
                    if (directive.templateUrl || !directive.controller) {
                        return;
                    }
                    const controllerDirectives = state._controllerDirectives ||
                        (state._controllerDirectives = nullObject());
                    assertNoDuplicate(`'${directiveName}' controller`, controllerDirectives[directiveName], directive, compileNode);
                    controllerDirectives[directiveName] = directive;
                }
                function collectDirectiveLinkFns(directive, directiveName, compileNode, templateAttrs, childTranscludeFn, preLinkFns, postLinkFns, newIsolateScopeDirective) {
                    try {
                        const compile = assertDefined(directive.compile);
                        const linkFn = compile.call(directive, compileNode, templateAttrs, childTranscludeFn);
                        appendDirectiveLinkResult(linkFn, directive, directiveName, preLinkFns, postLinkFns, newIsolateScopeDirective);
                    }
                    catch (err) {
                        $exceptionHandler(err);
                    }
                }
                function appendDirectiveLinkResult(linkFn, directive, directiveName, preLinkFns, postLinkFns, newIsolateScopeDirective) {
                    if (!linkFn) {
                        return;
                    }
                    const context = directive._originalDirective || directive;
                    const isolateScope = newIsolateScopeDirective === directive || !!directive._isolateScope;
                    if (isFunction(linkFn)) {
                        const linkCtx = linkFn._linkCtx;
                        pushLinkFnRecord(postLinkFns, linkFn, directive.require, directiveName, isolateScope, linkCtx, linkCtx !== undefined ? undefined : context);
                        return;
                    }
                    const preLinkCtx = linkFn._preLinkCtx || linkFn._linkCtx;
                    const postLinkCtx = linkFn._postLinkCtx || linkFn._linkCtx;
                    pushLinkFnRecord(preLinkFns, linkFn.pre, directive.require, directiveName, isolateScope, preLinkCtx, preLinkCtx !== undefined ? undefined : context);
                    pushLinkFnRecord(postLinkFns, linkFn.post, directive.require, directiveName, isolateScope, postLinkCtx, postLinkCtx !== undefined ? undefined : context);
                }
                /** Resolves required controllers from the current element or its ancestors. */
                function getControllers(directiveName, require, $element, elementControllers) {
                    let value;
                    if (typeof require === "string") {
                        const match = REQUIRE_PREFIX_REGEXP.exec(require);
                        if (!match) {
                            return null;
                        }
                        const name = require.substring(match[0].length);
                        const inheritType = match[1] || match[3];
                        const optional = match[2] === "?";
                        const originalElement = $element;
                        // If only parents then start at the parent element
                        if (inheritType === "^^") {
                            if ($element?.parentElement) {
                                $element = $element.parentElement;
                            }
                            else {
                                $element = undefined;
                            }
                            // Otherwise attempt getting the controller from elementControllers in case
                            // the element is transcluded (and has no data) and to avoid .data if possible
                        }
                        else {
                            value = elementControllers?.[name]?._instance;
                        }
                        if (!value) {
                            const dataName = `$${name}Controller`;
                            if (inheritType === "^^" &&
                                $element?.nodeType === NodeType._DOCUMENT_NODE) {
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
                            if (!value && inheritType && originalElement) {
                                const futureParentElement = getInheritedData(originalElement, FUTURE_PARENT_ELEMENT_KEY);
                                if (futureParentElement) {
                                    value = getInheritedData(futureParentElement, dataName);
                                }
                            }
                        }
                        if (!value && !optional) {
                            throw $compileError("ctreq", "Controller '{0}', required by directive '{1}', can't be found!", name, directiveName);
                        }
                    }
                    else if (Array.isArray(require)) {
                        value = [];
                        for (let i = 0, ii = require.length; i < ii; i++) {
                            value[i] = getControllers(directiveName, require[i], $element, elementControllers);
                        }
                    }
                    else if (require !== null && typeof require === "object") {
                        value = {};
                        for (const property in require) {
                            if (!hasOwn(require, property)) {
                                continue;
                            }
                            const controller = require[property];
                            value[property] = getControllers(directiveName, controller, $element, elementControllers);
                        }
                    }
                    return value || null;
                }
                /** Instantiates and stores directive controllers for the current node. */
                function setupControllers(node, attrs, transcludeFn, _controllerDirectives, isolateScope, scope, _newIsolateScopeDirective) {
                    const elementControllers = nullObject();
                    for (const controllerKey in _controllerDirectives) {
                        const directive = _controllerDirectives[controllerKey];
                        const locals = {
                            $scope: directive === _newIsolateScopeDirective ||
                                directive._isolateScope
                                ? isolateScope
                                : scope,
                            $element: node,
                            $attrs: attrs,
                            $transclude: transcludeFn,
                        };
                        let { controller } = directive;
                        if (controller === "@") {
                            controller = attrs[directive.name];
                        }
                        const controllerInstance = $controller(assertDefined(controller), locals, true, directive.controllerAs);
                        // For directives with element transclusion the element is a comment.
                        // In this case .data will not attach any data.
                        // Instead, we save the controllers for the element in a local hash and attach to .data
                        // later, once we have the actual element.
                        elementControllers[directive.name] = controllerInstance;
                        if (node.nodeType === NodeType._ELEMENT_NODE) {
                            setCacheData(node, `$${directive.name}Controller`, controllerInstance._instance);
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
                function appendDirectivesForName(targetDirectives, name, matchLocation, maxPriority) {
                    const directives = getDirectiveDefinitions(name);
                    const match = directives
                        ? appendMatchingDirectives(targetDirectives, directives, matchLocation, maxPriority)
                        : false;
                    return match;
                }
                function getDirectiveDefinitions(name) {
                    const cachedDirectives = directiveDefinitionCache[name];
                    if (cachedDirectives !== undefined) {
                        return cachedDirectives;
                    }
                    if (!hasOwn(directiveFactoryRegistry, name)) {
                        return null;
                    }
                    const directives = $injector.get(name + DirectiveSuffix) ||
                        EMPTY_DIRECTIVE_DEFINITIONS;
                    directiveDefinitionCache[name] = directives;
                    return directives;
                }
                function appendMatchingDirectives(targetDirectives, candidateDirectives, matchLocation, maxPriority) {
                    let match = false;
                    const useElementRestriction = matchLocation === "E";
                    if (maxPriority === undefined) {
                        if (useElementRestriction) {
                            for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
                                const directive = candidateDirectives[i];
                                if (directive._restrictElement) {
                                    ensureDirectiveBindingPlan(directive);
                                    targetDirectives.push(directive);
                                    match = directive;
                                }
                            }
                        }
                        else {
                            for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
                                const directive = candidateDirectives[i];
                                if (directive._restrictAttribute) {
                                    ensureDirectiveBindingPlan(directive);
                                    targetDirectives.push(directive);
                                    match = directive;
                                }
                            }
                        }
                        return match;
                    }
                    if (useElementRestriction) {
                        for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
                            const directive = candidateDirectives[i];
                            if (directive._restrictElement &&
                                maxPriority > directive.priority) {
                                ensureDirectiveBindingPlan(directive);
                                targetDirectives.push(directive);
                                match = directive;
                            }
                        }
                    }
                    else {
                        for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
                            const directive = candidateDirectives[i];
                            if (directive._restrictAttribute &&
                                maxPriority > directive.priority) {
                                ensureDirectiveBindingPlan(directive);
                                targetDirectives.push(directive);
                                match = directive;
                            }
                        }
                    }
                    return match;
                }
                function ensureDirectiveBindingPlan(directive) {
                    if (directive._bindings) {
                        return;
                    }
                    if (!directiveMayHaveBindings(directive)) {
                        directive._bindings = EMPTY_PARSED_DIRECTIVE_BINDINGS;
                        return;
                    }
                    const bindings = (directive._bindings = parseDirectiveBindings(directive, directive.name));
                    if (bindings._isolateScope !== null &&
                        typeof bindings._isolateScope === "object") {
                        directive._isolateBindings = bindings._isolateScope;
                    }
                }
                function directiveMayHaveBindings(directive) {
                    return !!directive._mayHaveBindings;
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
                    for (const key in dstAny) {
                        if (!hasOwn(dstAny, key)) {
                            continue;
                        }
                        let value = dstAny[key];
                        if (!key.startsWith("$") && !key.startsWith("_")) {
                            if (srcAny[key] && srcAny[key] !== value) {
                                if (typeof value === "string" && value.length) {
                                    const srcValue = srcAny[key];
                                    value += `${key === "style" ? ";" : " "}${typeof srcValue === "string"
                                        ? srcValue
                                        : stringify(srcValue)}`;
                                }
                                else {
                                    value = srcAny[key];
                                }
                            }
                            dst.$set(key, value, true, srcAttr[key]);
                        }
                    }
                    // copy the new attributes on the old attrs object
                    for (const key in srcAny) {
                        if (!hasOwn(srcAny, key)) {
                            continue;
                        }
                        const value = srcAny[key];
                        // Check if we already set this attribute in the loop above.
                        // `dst` will never contain hasOwnProperty as DOM parser won't let it.
                        // You will get an "InvalidCharacterError: DOM Exception 5" error if you
                        // have an attribute like "has-own-property" or "data-has-own-property", etc.
                        if (!hasOwn(dst, key) && !key.startsWith("$")) {
                            dstAny[key] = value;
                            if (key !== "class" && key !== "style") {
                                dstAttr[key] = srcAttr[key];
                            }
                        }
                    }
                }
                /** Compiles an async `templateUrl` directive and returns a delayed node-link descriptor. */
                function compileTemplateUrl(directives, $compileNode, tAttrs, $rootElement, childTranscludeFn, preLinkFns, postLinkFns, previousCompileContext) {
                    const origAsyncDirective = assertDefined(directives.shift());
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
                        ({ templateUrl } = origAsyncDirective);
                    }
                    templateUrl = stringify(templateUrl);
                    if (typeof templateUrl !== "string" || !templateUrl) {
                        throw $compileError("tplurl", "Directive '{0}' produced an invalid templateUrl: {1}", origAsyncDirective.name, stringify(templateUrl));
                    }
                    const { templateNamespace } = origAsyncDirective;
                    const asyncTemplatePlan = {
                        _url: templateUrl,
                        _namespace: templateNamespace,
                        _replace: !!origAsyncDirective.replace,
                        _directiveName: origAsyncDirective.name,
                    };
                    const delayedState = {
                        _linkQueue: [],
                        _directives: directives,
                        _afterTemplateChildLinkExecutor: null,
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
                        _asyncTemplatePlan: asyncTemplatePlan,
                    };
                    emptyElement($compileNode.element);
                    requestTemplate(templateUrl)
                        .then((content) => {
                        handleDelayedTemplateLoaded(delayedState, content);
                    })
                        .catch((error) => {
                        handleDelayedTemplateLoadError(delayedState, error);
                    });
                    return {
                        _nodeLinkFn: executeDelayedTemplateNodeLinkPlan,
                        _nodeLinkFnState: delayedState,
                        _asyncTemplatePlan: asyncTemplatePlan,
                    };
                }
                /** Throws when multiple directives request an incompatible exclusive feature on the same node. */
                function assertNoDuplicate(what, previousDirective, directive, node) {
                    if (previousDirective) {
                        throw $compileError("multidir", "Multiple directives [{0}, {1}] asking for {3} on: {4}", previousDirective.name, directive.name, what, startingTag(node));
                    }
                }
                /** Creates a synthetic text-interpolation directive for a text node. */
                function createTextInterpolateDirective(text) {
                    if (!text.includes(startSymbol)) {
                        return undefined;
                    }
                    const interpolateFn = $interpolate(text, true);
                    if (!interpolateFn) {
                        return undefined;
                    }
                    const { expressions } = interpolateFn;
                    const watchExpression = buildInterpolationWatchExpression(expressions);
                    const linkState = {
                        _interpolateFn: interpolateFn,
                        _watchExpression: watchExpression,
                        _singleExpression: expressions.length === 1 &&
                            text === startSymbol + watchExpression + endSymbol,
                    };
                    return {
                        priority: 0,
                        compile: compileTextInterpolateDirective,
                        _compileState: linkState,
                    };
                }
                /** Shared compile function for synthetic text-interpolation directives. */
                function compileTextInterpolateDirective() {
                    return {
                        post: textInterpolateLinkFn,
                        _postLinkCtx: this._compileState,
                    };
                }
                /** Determines the trust context required for a DOM attribute binding. */
                function getTrustedAttrContext(nodeName, attrNormalizedName) {
                    if (attrNormalizedName === "srcdoc") {
                        return SCE_CONTEXTS._HTML;
                    }
                    // All nodes with src attributes require a RESOURCE_URL value, except for
                    // img and various html5 media nodes, which require the MEDIA_URL context.
                    if (attrNormalizedName === "src" || attrNormalizedName === "ngSrc") {
                        if (!["img", "video", "audio", "source", "track"].includes(nodeName)) {
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
                /** Determines the trust context required for a DOM property binding. */
                function getTrustedPropContext(nodeName, propNormalizedName) {
                    const prop = propNormalizedName.toLowerCase();
                    return (PROP_CONTEXTS[`${nodeName}|${prop}`] ||
                        PROP_CONTEXTS[`*|${prop}`]);
                }
                /** Sanitizes a `srcset` string by trusting each URI entry individually. */
                function sanitizeSrcset(value, invokeType) {
                    if (!value) {
                        return value;
                    }
                    if (typeof value !== "string") {
                        throw $compileError("srcset", 'Can\'t pass trusted values to `{0}`: "{1}"', invokeType, stringify(value));
                    }
                    // Such values are a bit too complex to handle automatically inside the security adapter.
                    // Instead, we sanitize each of the URIs individually, which works, even dynamically.
                    // A single trusted media URL cannot represent a whole srcset list.
                    // If you want to programmatically set explicitly trusted unsafe URLs, you should use
                    // a trusted/sanitized HTML binding for the whole `img` tag and inject it using the
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
                        const uri = trim(rawUris[innerIdx]);
                        // sanitize the uri
                        result += uri.startsWith("unsafe:")
                            ? uri
                            : security.getTrustedMediaUrl(uri);
                        // add the descriptor
                        result += ` ${trim(rawUris[innerIdx + 1])}`;
                    }
                    // split the last item into uri and descriptor
                    const lastTuple = trim(rawUris[i * 2]).split(/\s/);
                    // sanitize the last uri
                    const uri = trim(lastTuple[0]);
                    result += uri.startsWith("unsafe:")
                        ? uri
                        : security.getTrustedMediaUrl(uri);
                    // and add the last descriptor if any
                    if (lastTuple.length === 2) {
                        result += ` ${trim(lastTuple[1])}`;
                    }
                    return result;
                }
                /** Adds an `ng-prop-*` directive for the given property binding. */
                function addPropertyDirective(node, directives, attrName, propName) {
                    if (EVENT_HANDLER_ATTR_REGEXP.test(propName)) {
                        throw $compileError("nodomevents", "Property bindings for HTML DOM event properties are disallowed");
                    }
                    const nodeName = getNodeName(node);
                    const trustedContext = getTrustedPropContext(nodeName, propName);
                    let sanitizer = (x) => x;
                    // Sanitize img[srcset] + source[srcset] values.
                    if (propName === "srcset" &&
                        (nodeName === "img" || nodeName === "source")) {
                        sanitizer = (value) => sanitizeSrcset(security.valueOf(value), "ng-prop-srcset");
                    }
                    else if (trustedContext) {
                        sanitizer = (value) => security.getTrusted(trustedContext, value);
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
                    if (!isNgAttr && !value.includes(startSymbol)) {
                        return;
                    }
                    const nodeName = getNodeName(node);
                    const trustedContext = getTrustedAttrContext(nodeName, name);
                    const mustHaveExpression = !isNgAttr;
                    const allOrNothing = isNgAttr || isAllOrNothingAttr(name);
                    const interpolateFn = $interpolate(value, mustHaveExpression, trustedContext, allOrNothing);
                    // no interpolation found -> ignore
                    if (!interpolateFn) {
                        return;
                    }
                    if (name === "multiple" && nodeName === "select") {
                        throw $compileError("selmulti", "Binding to the 'multiple' attribute is not supported. Element: {0}", startingTag(node.outerHTML));
                    }
                    if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
                        throw $compileError("nodomevents", "Interpolations for HTML DOM event attributes are disallowed");
                    }
                    const directive = {
                        priority: 100,
                        compile: compileAttrInterpolateDirective,
                        _compileState: {
                            _name: name,
                            _value: value,
                            _trustedContext: trustedContext,
                            _allOrNothing: allOrNothing,
                            _isNgAttr: isNgAttr,
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
                        throw $compileError("missingattr", "Attribute '{0}' of '{1}' is non-optional and must be set!", attrName, directiveName);
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
                    const destinationTarget = assertDefined(destAny.$target);
                    const attrsObservers = attrs._observers || (attrs._observers = nullObject());
                    const bindingChangeState = {
                        _destAny: destAny,
                        _onChangesQueue: onChangesQueueState,
                        _scope: scope,
                    };
                    if (bindings) {
                        for (const scopeName in bindings) {
                            if (!hasOwn(bindings, scopeName)) {
                                continue;
                            }
                            const definition = bindings[scopeName];
                            const { _attrName: attrName, _optional: optional, _mode: mode, // @, =, <, or &
                             } = definition;
                            let lastValue;
                            let parentGet;
                            let parentSet;
                            let compare;
                            let removeWatch;
                            switch (mode) {
                                case "@": {
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
                                    removeWatch = attrs.$observe(attrName, (value) => {
                                        handleStringBindingObserve(stringBindingState, value);
                                    });
                                    assertDefined(attrsObservers[attrName])._scope = scope;
                                    lastValue = attrsAny[attrName];
                                    if (typeof lastValue === "string") {
                                        // If the attribute has been provided then we trigger an interpolation to ensure
                                        // the value is there for use in the link fn
                                        destAny[scopeName] = assertDefined($interpolate(lastValue))(scope);
                                    }
                                    else if (typeof lastValue === "boolean") {
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
                                }
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
                                    parentGet =
                                        typeof attr === "string" ? $parse(attr) : undefined;
                                    if (parentGet?._literal) {
                                        compare = equals;
                                    }
                                    else {
                                        compare = simpleCompare;
                                    }
                                    parentSet =
                                        parentGet?._assign ||
                                            function () {
                                                throw $compileError("nonassign", "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!", String(attrsAny[attrName]), attrName, directive.name);
                                            };
                                    // store the value that the parent scope had after the last check:
                                    const initialValue = parentGet
                                        ? callFunction(parentGet, undefined, scopeTarget)
                                        : undefined;
                                    lastValue = destinationTarget[scopeName] = Array.isArray(initialValue)
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
                                    const twoWayAttrExpression = attrsAny[attrName];
                                    if (typeof twoWayAttrExpression === "string") {
                                        const syncParentValue = $parse(twoWayAttrExpression, (parentValue) => syncTwoWayParentValue(twoWayBindingState, parentValue));
                                        // make it lazy as we dont want to trigger the two way data binding at this point
                                        scope.$watch(twoWayAttrExpression, (val) => {
                                            handleTwoWayExpressionChange(twoWayBindingState, syncParentValue, val);
                                        }, true);
                                    }
                                    removeWatch = destination.$watch(attrName, (val) => {
                                        handleTwoWayDestinationChange(twoWayBindingState, val);
                                    }, true);
                                    removeWatchCollection.push(removeWatch);
                                    break;
                                }
                                case "<": {
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
                                    parentGet =
                                        typeof attrsAny[attrName] === "string"
                                            ? $parse(attrsAny[attrName])
                                            : undefined;
                                    const initialOneWayValue = parentGet
                                        ? callFunction(parentGet, undefined, scopeTarget)
                                        : undefined;
                                    assertDefined(destAny.$target)[scopeName] =
                                        parentGet?._literal ||
                                            initialOneWayValue === null ||
                                            typeof initialOneWayValue !== "object"
                                            ? initialOneWayValue
                                            : createScope(initialOneWayValue, scope.$handler);
                                    const oneWayBindingState = {
                                        _bindingChangeState: bindingChangeState,
                                        _destAny: destAny,
                                        _firstChange: true,
                                        _literal: !!parentGet?._literal,
                                        _parentGet: parentGet,
                                        _scopeName: scopeName,
                                        _scopeTarget: scopeTarget,
                                    };
                                    oneWayBindingState._lastInputs =
                                        evaluateOneWayBindingInputs(oneWayBindingState);
                                    initialChanges[scopeName] = {
                                        currentValue: assertDefined(destAny.$target)[scopeName],
                                        firstChange: oneWayBindingState._firstChange,
                                    };
                                    scope.$target.attrs = attrs;
                                    const oneWayAttrExpression = attrsAny[attrName];
                                    if (typeof oneWayAttrExpression === "string") {
                                        removeWatch = scope.$watch(oneWayAttrExpression, (val) => {
                                            handleOneWayBindingChange(oneWayBindingState, val);
                                        }, true);
                                        removeWatchCollection.push(removeWatch);
                                    }
                                    break;
                                }
                                case "&": {
                                    if (!optional && !hasOwn(attrs, attrName)) {
                                        strictBindingsCheck(attrName, directive.name);
                                    }
                                    // Don't assign Object.prototype method to scope
                                    parentGet = hasOwn(attrs, attrName)
                                        ? $parse(String(attrsAny[attrName]))
                                        : undefined;
                                    // Don't assign noop to destination if expression is not valid
                                    if (!parentGet && optional) {
                                        break;
                                    }
                                    const expressionBindingState = {
                                        _parentGet: parentGet,
                                        _scopeTarget: scopeTarget,
                                    };
                                    assertDefined(destAny.$target)[scopeName] = function (locals) {
                                        return invokeExpressionBinding(expressionBindingState, locals);
                                    };
                                    break;
                                }
                            }
                        }
                    }
                    return {
                        _initialChanges: initialChanges,
                        _removeWatches: removeWatchCollection.length > 0
                            ? () => {
                                removeDirectiveBindingWatches(removeWatchCollection);
                            }
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
    if (letter !== letter?.toLowerCase()) {
        throw $compileError("baddir", "Directive/Component name '{0}' is invalid. The first character must be a lowercase letter", name);
    }
    if (name !== name.trim()) {
        throw $compileError("baddir", "Directive/Component name '{0}' is invalid. The name should not contain leading or trailing whitespaces", name);
    }
}
/**
 * Normalizes the `require` declaration for a directive.
 * Object-form requires inherit their own key when the value omits the directive name
 * (e.g. `{ foo: "^^" }` becomes `{ foo: "^^foo" }`).
 */
function getDirectiveRequire(directive) {
    const require = directive.require || (directive.controller && directive.name);
    if (!Array.isArray(require) &&
        require !== null &&
        typeof require === "object") {
        for (const key in require) {
            if (!hasOwn(require, key)) {
                continue;
            }
            const value = require[key];
            const match = REQUIRE_PREFIX_REGEXP.exec(value);
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
    if (restrict && !(typeof restrict === "string" && /[EA]/.test(restrict))) {
        throw $compileError("badrestrict", "Restrict property '{0}' of directive '{1}' is invalid", restrict, name);
    }
    return typeof restrict === "string" ? restrict : "EA";
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
        /SVG/.exec(toString.call(node))
        ? "svg"
        : "html";
}
/**
 * Builds a stable node array for linking so index-based mappings stay valid even if DOM shape changes.
 */
function buildStableNodeList(plan, nodeRef) {
    const nodeRefIsNodeRef = nodeRef instanceof NodeRef;
    const nodeIndices = plan._nodeIndices;
    const stableNodeList = new Array(nodeIndices.length);
    for (let i = 0, l = nodeIndices.length; i < l; i++) {
        const idx = nodeIndices[i];
        stableNodeList[i] = nodeRefIsNodeRef
            ? nodeRef._getIndex(idx)
            : nodeRef[idx];
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
    const elementsToRemoveRef = elementsToRemove instanceof NodeRef ? elementsToRemove : null;
    const firstElementToRemove = (elementsToRemoveRef ? elementsToRemoveRef._getAny() : elementsToRemove);
    const parent = firstElementToRemove.parentNode;
    if (parent) {
        if (index !== undefined) {
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
    const removedElements = elementsToRemoveRef
        ? elementsToRemoveRef._collection()
        : [firstElementToRemove];
    for (let i = 0, l = removedElements.length; i < l; i++) {
        fragment.appendChild(removedElements[i]);
    }
    if (elementsToRemoveRef) {
        elementsToRemoveRef.node = newNode;
    }
}

export { CompileProvider, DirectiveSuffix, applyTextInterpolationValue, buildInterpolationWatchExpression, buildStableNodeList, byPriority, detectNamespaceForChildElements, getDirectiveRequire, getDirectiveRestrict, replaceWith, wrapTemplate };
