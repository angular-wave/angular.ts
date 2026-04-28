import { _view, _state, _injector, _anchorScroll, _interpolate, _compile, _controller, _transitions } from '../../injection-tokens.js';
import { assign, arrayFrom, isString, isDefined, isFunction, isInstanceOf, isArray } from '../../shared/utils.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { ViewConfig } from '../state/views.js';
import { dealoc, getCacheData, setCacheData, getInheritedData, removeElement } from '../../shared/dom.js';
import { getLocals } from '../state/state-registry.js';

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
    const promise = new Promise((resolveParam, rejectParam) => {
        resolve = resolveParam;
        reject = rejectParam;
    });
    return { promise, resolve, reject: reject };
}
const controllerRegisteredScopes = new WeakMap();
const controllerLastParamsChangedTransition = new WeakMap();
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
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve` (this
 * can be customized using [[ViewDeclaration.resolveAs]]).  This can be then accessed from the template.
 *
 * Note that when `controllerAs` is being used, `$resolve` is set on the controller instance *after* the
 * controller is instantiated.  The `$onInit()` hook can be used to perform initialization code which
 * depends on `$resolve` data.
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
ViewDirective.$inject = [_view, _state, _injector, _anchorScroll, _interpolate];
/**
 * Renders and updates the currently active view configuration.
 */
function ViewDirective($view, $state, $injector, $anchorScroll, $interpolate) {
    const getAnimate = createLazyAnimate($injector);
    function getRenderer() {
        return {
            enter(element, target, cb) {
                const animate = getAnimateForNode(getAnimate, element);
                if (animate) {
                    animate.enter(element, null, target).done(cb);
                }
                else {
                    target.after(element);
                    cb();
                }
            },
            leave(element, cb) {
                const animate = getAnimateForNode(getAnimate, element);
                if (animate) {
                    animate.leave(element).done(cb);
                }
                else {
                    removeElement(element);
                    cb();
                }
            },
        };
    }
    const rootData = {
        $cfg: { viewDecl: { $context: $view._rootViewContext() } },
        $ngView: {},
    };
    const directive = {
        count: 0,
        terminal: true,
        priority: 400,
        transclude: "element",
        compile(_tElement, _tAttrs, $transclude) {
            const transclude = $transclude;
            return function (scope, $element, attrs) {
                const onloadExp = attrs.onload || "", autoScrollExp = attrs.autoscroll, renderer = getRenderer(), inherited = getInheritedData($element, "$ngView") || rootData, name = $interpolate(attrs.ngView || attrs.name || "")(scope) || "$default";
                let previousEl = null;
                let currentEl = null;
                let currentScope = null;
                let viewConfig;
                let configUpdateVersion = 0;
                const parentFqn = inherited.$cfg.viewDecl.$context.name || inherited.$ngView.fqn;
                const activeNgView = {
                    id: directive.count++, // Global sequential ID for ng-view tags added to DOM
                    name, // ng-view name, retained internally for nested view matching
                    fqn: parentFqn ? `${parentFqn}.${name}` : name, // fully qualified name, describes location in DOM
                    config: null, // The active ViewConfig loaded for this ng-view
                    configUpdated: configUpdatedCallback, // Called when the matching ViewConfig changes
                    get creationContext() {
                        // Inherit the parent view context for nested ng-view elements.
                        const fromParentTag = inherited.$ngView.creationContext;
                        return (inherited.$cfg.viewDecl.$context ||
                            fromParentTag ||
                            rootData.$cfg.viewDecl.$context);
                    },
                };
                function configUpdatedCallback(config) {
                    if (config && !isInstanceOf(config, ViewConfig))
                        return;
                    const updateVersion = ++configUpdateVersion;
                    if (!config) {
                        if (!viewConfig)
                            return;
                        queueMicrotask(() => {
                            if (updateVersion !== configUpdateVersion ||
                                viewConfig !== undefined) {
                                return;
                            }
                            activeNgView.config = null;
                            updateView(undefined);
                        });
                        viewConfig = undefined;
                        activeNgView.config = null;
                        return;
                    }
                    if (viewConfig === config)
                        return;
                    activeNgView.config = config || null;
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
                    if (previousEl) {
                        removeElement(previousEl);
                        previousEl = null;
                    }
                    if (currentScope) {
                        currentScope.$destroy();
                        currentScope = null;
                    }
                    if (currentEl) {
                        const _viewData = getCacheData(currentEl, "$ngViewAnim");
                        renderer.leave(currentEl, function () {
                            _viewData?.$$animLeave.resolve();
                            previousEl = null;
                        });
                        previousEl = currentEl;
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
                    currentEl = transclude(newScope, (clone) => {
                        const elementClone = getFirstElementFromClone(clone);
                        const cloneNodes = getRootNodesFromClone(clone);
                        if (!elementClone) {
                            return;
                        }
                        cloneNodes.forEach((node) => {
                            setCacheData(node, "$ngViewAnim", $ngViewAnim);
                            setCacheData(node, "$ngView", $ngViewData);
                        });
                        renderer.enter(elementClone, $element, () => {
                            animEnter.resolve(undefined);
                            if (currentScope)
                                currentScope.$emit("$viewContentAnimationEnded");
                            if ((isDefined(autoScrollExp) && !autoScrollExp) ||
                                (autoScrollExp && scope.$eval(autoScrollExp))) {
                                $anchorScroll(elementClone);
                            }
                        });
                        cleanupLastView();
                    });
                    currentScope = newScope;
                    /**
                     * Fired once the view is **loaded**, *after* the DOM is rendered.
                     *
                     * @param event Event object.
                     */
                    currentScope.$emit("$viewContentLoaded", config || viewConfig);
                    currentScope.$eval(onloadExp);
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
                    viewDecl: {},
                    getTemplate: () => undefined,
                });
                const resolveCtx = cfg.path && new ResolveContext(cfg.path, $injector);
                $element.innerHTML =
                    cfg.getTemplate($element, resolveCtx) || initial;
                const link = $compile($element.contentDocument ||
                    $element.childNodes);
                const { controller } = cfg;
                const { controllerAs } = cfg.viewDecl;
                const { resolveAs } = cfg.viewDecl;
                const locals = resolveCtx ? getLocals(resolveCtx) : undefined;
                const targetScope = scope.$target;
                if (resolveAs) {
                    targetScope[resolveAs] = locals;
                }
                if (controller) {
                    const controllerInstance = $controller(controller, assign({}, locals, { $scope: scope, $element }));
                    if (controllerAs) {
                        targetScope[controllerAs] = controllerInstance;
                        if (resolveAs) {
                            targetScope[controllerAs][resolveAs] = locals;
                        }
                    }
                    // TODO: Use $view service as a central point for registering component-level hooks
                    // Then, when a component is created, tell the $view service, so it can invoke hooks
                    // $view.componentLoaded(controllerInstance, { $scope: scope, $element: $element });
                    // scope.$on('$destroy', () => $view.componentUnloaded(controllerInstance, { $scope: scope, $element: $element }));
                    setCacheData($element, "$ngControllerController", controllerInstance);
                    arrayFrom($element.children).forEach((ell) => {
                        setCacheData(ell, "$ngControllerController", controllerInstance);
                    });
                    registerControllerCallbacks($transitions, controllerInstance, scope, cfg);
                }
                link(scope);
                const componentName = cfg
                    .component;
                const callbackConfig = cfg;
                if (isString(componentName)) {
                    const kebobName = componentName
                        .replace(/([A-Z])/g, "-$1")
                        .replace(/^-/, "")
                        .toLowerCase();
                    const tagRegexp = new RegExp(`^(x-|data-)?${kebobName}$`, "i");
                    const getComponentController = () => {
                        const candidates = arrayFrom($element.querySelectorAll("*"));
                        const directiveEl = candidates.find((el) => el.tagName && tagRegexp.exec(el.tagName));
                        if (!directiveEl) {
                            return undefined;
                        }
                        const camelNameFromTag = directiveEl.tagName
                            .toLowerCase()
                            .replace(/^(x-|data-)/, "")
                            .replace(/-([a-z])/g, (_all, letter) => letter.toUpperCase());
                        const tryControllerKey = (key) => getCacheData(directiveEl, key) ||
                            getInheritedData(directiveEl, key);
                        const scopeWithCtrl = getCacheData(directiveEl, "$isolateScope") ||
                            getInheritedData(directiveEl, "$isolateScope") ||
                            getCacheData(directiveEl, "$scope") ||
                            getInheritedData(directiveEl, "$scope");
                        return (tryControllerKey(`$${componentName}Controller`) ||
                            tryControllerKey(`$${camelNameFromTag}Controller`) ||
                            tryControllerKey("$ngControllerController") ||
                            scopeWithCtrl?.$ctrl);
                    };
                    const registerComponentCallbacks = (attempt = 0) => {
                        if (scope.$handler._destroyed) {
                            return;
                        }
                        const componentCtrl = getComponentController();
                        if (componentCtrl) {
                            registerControllerCallbacks($transitions, componentCtrl, scope, callbackConfig);
                            return;
                        }
                        if (attempt >= 10) {
                            return;
                        }
                        queueMicrotask(() => registerComponentCallbacks(attempt + 1));
                    };
                    registerComponentCallbacks();
                }
            };
        },
    };
}
/** @ignore */
/** @ignore incrementing id */
let _ngCanExitId = 0;
/**
 * @ignore TODO: move these callbacks to $view and/or `/hooks/components.ts` or something
 */
function registerControllerCallbacks($transitions, controllerInstance, $scope, cfg) {
    let registeredScopes = controllerRegisteredScopes.get(controllerInstance);
    if (!registeredScopes) {
        registeredScopes = new WeakSet();
        controllerRegisteredScopes.set(controllerInstance, registeredScopes);
    }
    if (registeredScopes.has($scope)) {
        return;
    }
    registeredScopes.add($scope);
    // Call $onInit() ASAP
    const onInit = controllerInstance.$onInit;
    if (isFunction(onInit) && !cfg.viewDecl.component) {
        onInit();
    }
    const viewState = cfg.path[cfg.path.length - 1].state.self;
    const hookOptions = { bind: controllerInstance };
    // Add component-level hook for ngOnParamsChanged
    if (isFunction(controllerInstance.ngOnParamsChanged)) {
        const onParamsChanged = controllerInstance.ngOnParamsChanged;
        const resolveContext = new ResolveContext(cfg.path, cfg.factory?._injector);
        const viewCreationTrans = resolveContext.getResolvable("$transition$")
            .data;
        // Fire callback on any successful transition
        const paramsUpdated = ($transition$) => {
            if (!$transition$)
                return;
            if (controllerLastParamsChangedTransition.get(controllerInstance) ===
                $transition$) {
                return;
            }
            controllerLastParamsChangedTransition.set(controllerInstance, $transition$);
            // Exit early if the $transition$ is the same as the view was created within.
            // Exit early if the $transition$ will exit the state the view is for.
            if ($transition$ === viewCreationTrans ||
                $transition$.exiting().indexOf(viewState) !== -1) {
                return;
            }
            const toParams = $transition$.params("to");
            const fromParams = $transition$.params("from");
            const treeChanges = $transition$ && $transition$.treeChanges;
            const toNodes = (isFunction(treeChanges)
                ? (treeChanges.call($transition$, "to") ?? [])
                : []);
            const fromNodes = (isFunction(treeChanges)
                ? (treeChanges.call($transition$, "from") ?? [])
                : []);
            const toSchema = [];
            toNodes.forEach((node) => {
                node.paramSchema.forEach((param) => {
                    toSchema.push(param);
                });
            });
            const fromSchema = [];
            fromNodes.forEach((node) => {
                node.paramSchema.forEach((param) => {
                    fromSchema.push(param);
                });
            });
            // Find the to params that have different values than the from params
            const changedToParams = [];
            toSchema.forEach((param) => {
                const idx = fromSchema.indexOf(param);
                if (idx === -1 ||
                    !fromSchema[idx].type.equals(toParams[param.id], fromParams[param.id])) {
                    changedToParams.push(param);
                }
            });
            // Only trigger callback if a to param has changed or is new
            if (changedToParams.length) {
                // Filter the params to only changed/new to params.  `$transition$.params()` may be used to get all params.
                const newValues = {};
                changedToParams.forEach((param) => {
                    const key = param.id;
                    if (key in toParams)
                        newValues[key] = toParams[key];
                });
                onParamsChanged.call(controllerInstance, newValues, $transition$);
            }
        };
        const hookRegistryKey = [
            viewState?.name || "",
            cfg.viewDecl.$ngViewName || "$default",
            cfg.viewDecl.$ngViewContextAnchor || "^",
        ].join("::");
        const rootScope = $scope.$root;
        const registryProp = "__ngRouterParamsChangedHooks__";
        const hookRegistry = rootScope[registryProp] ||
            (rootScope[registryProp] = new Map());
        hookRegistry.get(hookRegistryKey)?.();
        const deregisterParamsHook = $transitions.onSuccess({}, paramsUpdated, hookOptions);
        hookRegistry.set(hookRegistryKey, deregisterParamsHook);
        $scope.$on("$destroy", () => {
            if (hookRegistry.get(hookRegistryKey) === deregisterParamsHook) {
                hookRegistry.delete(hookRegistryKey);
            }
            deregisterParamsHook();
        });
    }
    // Add component-level hook for ngCanExit
    if (isFunction(controllerInstance.ngCanExit)) {
        const ngCanExit = controllerInstance.ngCanExit;
        const id = _ngCanExitId++;
        const cacheProp = "_ngCanExitIds";
        /**
         * Returns true if any transition in the redirect chain already answered truthy.
         */
        const prevTruthyAnswer = (trans) => !!trans &&
            ((trans[cacheProp] && trans[cacheProp][id] === true) ||
                prevTruthyAnswer(trans.redirectedFrom()));
        // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
        const wrappedHook = (trans) => {
            let promise;
            const ids = (trans[cacheProp] = trans[cacheProp] || {});
            if (!prevTruthyAnswer(trans)) {
                promise = Promise.resolve(ngCanExit.call(controllerInstance, trans));
                promise.then((val) => (ids[id] = val !== false));
            }
            return promise;
        };
        const criteria = { exiting: viewState.name };
        $scope.$on("$destroy", $transitions.onBefore(criteria, wrappedHook, hookOptions));
    }
}

export { ViewDirective, ViewDirectiveFill };
