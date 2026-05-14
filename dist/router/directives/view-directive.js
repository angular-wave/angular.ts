import { _view, _state, _anchorScroll, _interpolate, _parse, _compile, _controller, _transitions, _injector } from '../../injection-tokens.js';
import { assertDefined, assign, isString, isDefined, isInstanceOf, isArray, arrayFrom } from '../../shared/utils.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { dealoc, getCacheData, setCacheData, getInheritedData, removeElement } from '../../shared/dom.js';
import { getLocals } from '../state/state-registry.js';
import { getViewTemplate } from '../view/view.js';
import { registerViewControllerCallbacks, getComponentController } from './view-controller-hooks.js';

function getFirstElementFromClone(clone) {
    if (!clone)
        return null;
    if (isInstanceOf(clone, HTMLElement)) {
        return clone;
    }
    if (isInstanceOf(clone, DocumentFragment)) {
        const firstElement = clone.firstElementChild;
        return isInstanceOf(firstElement, HTMLElement) ? firstElement : null;
    }
    if (isInstanceOf(clone, NodeList) || isArray(clone)) {
        for (let i = 0, l = clone.length; i < l; i++) {
            const node = clone[i];
            if (isInstanceOf(node, HTMLElement)) {
                return node;
            }
        }
        return null;
    }
    return isInstanceOf(clone, Element) ? clone : null;
}
function getRootNodesFromClone(clone) {
    if (!clone) {
        return [];
    }
    if (isInstanceOf(clone, DocumentFragment)) {
        return arrayFrom(clone.childNodes);
    }
    return isInstanceOf(clone, NodeList) || isArray(clone)
        ? arrayFrom(clone)
        : [clone];
}
function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return {
        promise,
        resolve: assertDefined(resolve),
        reject: assertDefined(reject),
    };
}
/**
 * `ng-view`: A viewport directive which is filled in by a view from the active state.
 *
 * ### Attributes
 *
 * - `name`: (Optional) A view name.
 *   Named views are targeted from [[StateDeclaration.views]] entries.
 *
 * - `autoscroll`: an expression. When it evaluates to true, the `ng-view` will be scrolled into view when it is activated.
 *   Uses [[$anchorScroll]] to do the scrolling.
 *
 * - `onload`: Expression to evaluate whenever the view updates.
 *
 * #### Example:
 * A state can render into the unnamed `$default` view, or target named views.
 *
 * ```html
 * <div ng-view></div>
 * <div ng-view="messagelist"></div>
 * ```
 *
 * ```js
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 *
 * $stateProvider.state("messages", {
 *   views: {
 *     messagelist: "messageList"
 *   }
 * })
 * ```
 *
 * #### Examples for `autoscroll`:
 * ```html
 * <!-- If autoscroll present with no expression,
 *      then scroll ng-view into view -->
 * <ng-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ng-view into view if expression evaluates to true -->
 * <ng-view autoscroll='true'/>
 * <ng-view autoscroll='false'/>
 * <ng-view autoscroll='scopeVariable'/>
 * ```
 *
 * Resolve data:
 *
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve`.
 *
 * #### Example:
 * ```js
 * $stateProvider.state('home', {
 *   template: '<my-component user="$resolve.user"></my-component>',
 *   resolve: {
 *     user: function(UserService) { return UserService.fetchUser(); }
 *   }
 * });
 * ```
 */
ViewDirective.$inject = [_view, _state, _anchorScroll, _interpolate, _parse];
/**
 * Renders and updates the currently active view configuration.
 */
function ViewDirective($view, $state, $anchorScroll, $interpolate, $parse) {
    const rootData = {
        $cfg: { _viewDecl: { _context: $view._rootViewContext() } },
        $ngView: {},
    };
    const directive = {
        count: 0,
        terminal: true,
        priority: 400,
        transclude: "element",
        compile(_tElement, _tAttrs, $transclude) {
            const transclude = assertDefined($transclude);
            return function (scope, $element, attrs) {
                const onloadExp = attrs.onload || "", autoScrollExp = attrs.autoscroll, inherited = getInheritedData($element, "$ngView") || rootData, rawName = assertDefined($interpolate(attrs.ngView || attrs.name || ""))(scope), name = isString(rawName) && rawName ? rawName : "$default";
                const onloadFn = onloadExp ? $parse(onloadExp) : undefined;
                const autoScrollFn = autoScrollExp ? $parse(autoScrollExp) : undefined;
                let currentEl = null;
                let currentScope = null;
                let viewConfig;
                let configUpdateVersion = 0;
                const parentFqn = inherited.$cfg._viewDecl._context.name || inherited.$ngView._fqn;
                const activeNgView = {
                    _id: directive.count++, // Global sequential ID for ng-view tags added to DOM
                    _element: $element,
                    _name: name, // ng-view name, retained internally for nested view matching
                    _fqn: parentFqn ? `${parentFqn}.${name}` : name, // fully qualified name, describes location in DOM
                    _config: null,
                    _configUpdated: configUpdatedCallback,
                    get _creationContext() {
                        // Inherit the parent view context for nested ng-view elements.
                        const fromParentTag = inherited.$ngView._creationContext;
                        return (inherited.$cfg._viewDecl._context ||
                            fromParentTag ||
                            rootData.$cfg._viewDecl._context);
                    },
                };
                function configUpdatedCallback(config) {
                    const updateVersion = ++configUpdateVersion;
                    if (!config) {
                        if (!viewConfig)
                            return;
                        queueMicrotask(() => {
                            if (updateVersion !== configUpdateVersion ||
                                viewConfig !== undefined) {
                                return;
                            }
                            activeNgView._config = null;
                            updateView(undefined);
                        });
                        viewConfig = undefined;
                        activeNgView._config = null;
                        return;
                    }
                    if (viewConfig === config)
                        return;
                    activeNgView._config = config || null;
                    viewConfig = config;
                    updateView(config);
                }
                setCacheData($element, "$ngView", { $ngView: activeNgView });
                updateView();
                const unregister = $view._registerNgView(activeNgView);
                scope.$on("$destroy", function () {
                    unregister();
                });
                function cleanupLastView() {
                    if (currentScope) {
                        currentScope.$destroy();
                        currentScope = null;
                    }
                    if (currentEl) {
                        const _viewData = getCacheData(currentEl, "$ngViewAnim");
                        removeElement(currentEl);
                        _viewData?.$$animLeave.resolve(undefined);
                        currentEl = null;
                    }
                }
                function updateView(config) {
                    const newScope = scope.$new();
                    const animEnter = withResolvers();
                    const animLeave = withResolvers();
                    const $ngViewData = {
                        $cfg: config,
                        $ngView: activeNgView,
                    };
                    const $ngViewAnim = {
                        $animEnter: animEnter.promise,
                        $animLeave: animLeave.promise,
                        $$animLeave: animLeave,
                    };
                    /**
                     * Fired once the view **begins loading**, *before* the DOM is rendered.
                     *
                     * @param event Event object.
                     * @param viewName Name of the view.
                     */
                    newScope.$emit("$viewContentLoading", name);
                    let enteredElement = null;
                    transclude(newScope, (clone) => {
                        const elementClone = getFirstElementFromClone(clone);
                        const cloneNodes = getRootNodesFromClone(clone);
                        if (!elementClone) {
                            return;
                        }
                        for (let i = 0; i < cloneNodes.length; i++) {
                            const node = cloneNodes[i];
                            setCacheData(node, "$ngViewAnim", $ngViewAnim);
                            setCacheData(node, "$ngView", $ngViewData);
                        }
                        enteredElement = elementClone;
                        $element.after(elementClone);
                        animEnter.resolve(undefined);
                        cleanupLastView();
                        if ((isDefined(autoScrollExp) && !autoScrollExp) ||
                            (autoScrollExp && autoScrollFn?.(scope))) {
                            $anchorScroll(elementClone);
                        }
                    });
                    currentEl = enteredElement;
                    currentScope = newScope;
                    currentScope.$emit("$viewContentAnimationEnded");
                    /**
                     * Fired once the view is **loaded**, *after* the DOM is rendered.
                     *
                     * @param event Event object.
                     */
                    currentScope.$emit("$viewContentLoaded", config || viewConfig);
                    onloadFn?.(currentScope);
                }
            };
        },
    };
    return directive;
}
ViewDirectiveFill.$inject = [_compile, _controller, _transitions, _injector];
/**
 * Instantiates the active view template and wires its controller lifecycle.
 */
function ViewDirectiveFill($compile, $controller, $transitions, $injector) {
    return {
        priority: -400,
        compile(tElement) {
            const initial = tElement.innerHTML;
            dealoc(tElement, true);
            return function (scope, $element) {
                const data = getCacheData($element, "$ngView");
                if (!data) {
                    $element.innerHTML = initial;
                    $compile($element.contentDocument ||
                        $element.childNodes)(scope);
                    return;
                }
                const cfg = (data.$cfg || {
                    _viewDecl: {},
                });
                const resolveCtx = cfg._path && new ResolveContext(cfg._path, $injector);
                $element.innerHTML = data.$cfg
                    ? getViewTemplate(data.$cfg, $element, assertDefined(resolveCtx)) ||
                        initial
                    : initial;
                const link = $compile($element.contentDocument ||
                    $element.childNodes);
                const controller = cfg._controller;
                const locals = resolveCtx ? getLocals(resolveCtx) : undefined;
                const targetScope = scope.$target;
                targetScope.$resolve = locals;
                if (controller) {
                    const controllerInstance = $controller(controller, assign({}, locals, { $scope: scope, $element }));
                    // TODO: Use $view service as a central point for registering component-level hooks
                    // Then, when a component is created, tell the $view service, so it can invoke hooks
                    // $view.componentLoaded(controllerInstance, { $scope: scope, $element: $element });
                    // scope.$on('$destroy', () => $view.componentUnloaded(controllerInstance, { $scope: scope, $element: $element }));
                    setCacheData($element, "$ngControllerController", controllerInstance);
                    const { children } = $element;
                    for (let i = 0; i < children.length; i++) {
                        setCacheData(children[i], "$ngControllerController", controllerInstance);
                    }
                    registerViewControllerCallbacks($transitions, controllerInstance, scope, cfg);
                }
                link(scope);
                const componentName = cfg
                    ._component;
                const callbackConfig = cfg;
                if (isString(componentName)) {
                    const kebobName = componentName
                        .replace(/([A-Z])/g, "-$1")
                        .replace(/^-/, "")
                        .toLowerCase();
                    const tagRegexp = new RegExp(`^${kebobName}$`, "i");
                    const registerComponentCallbacks = (attempt = 0) => {
                        if (scope.$handler._destroyed) {
                            return;
                        }
                        const componentCtrl = getComponentController($element, componentName, tagRegexp);
                        if (componentCtrl) {
                            registerViewControllerCallbacks($transitions, componentCtrl, scope, callbackConfig);
                            return;
                        }
                        if (attempt >= 10) {
                            return;
                        }
                        queueMicrotask(() => {
                            registerComponentCallbacks(attempt + 1);
                        });
                    };
                    registerComponentCallbacks();
                }
            };
        },
    };
}

export { ViewDirective, ViewDirectiveFill };
