import { _view, _state, _anchorScroll, _interpolate, _parse } from '../../injection-tokens.js';
import { assertDefined, isDefined, isString, isInstanceOf, isArray, arrayFrom } from '../../shared/utils.js';
import { getCacheData, dealoc, getNormalizedAttr, getInheritedData, setCacheData, removeElement } from '../../shared/dom.js';

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
 * ### Attribute Runtime
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
    const rootContext = $view._rootViewContext();
    const rootData = {
        $cfg: { _viewDecl: { _context: rootContext } },
        $ngView: {},
    };
    const directive = {
        count: 0,
        terminal: true,
        priority: 400,
        transclude: "element",
        compile(tElement, $transclude) {
            const transclude = assertDefined($transclude);
            const onloadExp = getNormalizedAttr(tElement, "onload") ?? "";
            const autoScrollExp = getNormalizedAttr(tElement, "autoscroll");
            const viewNameExp = getNormalizedAttr(tElement, "ngView") ??
                getNormalizedAttr(tElement, "name") ??
                "";
            return function (scope, $element) {
                const inherited = getInheritedData($element, "$ngView") ?? rootData, rawName = assertDefined($interpolate(viewNameExp))(scope), name = isString(rawName) && rawName ? rawName : "$default";
                const onloadFn = onloadExp ? $parse(onloadExp) : undefined;
                const autoScrollFn = autoScrollExp ? $parse(autoScrollExp) : undefined;
                let currentEl = null;
                let currentScope = null;
                let viewConfig;
                let configUpdateVersion = 0;
                let initialTemplate;
                const inheritedContext = inherited.$cfg._viewDecl._context;
                const parentFqn = inheritedContext?.name ?? inherited.$ngView._fqn;
                const activeNgView = {
                    _id: directive.count++, // Global sequential ID for ng-view tags added to DOM
                    _element: $element,
                    _name: name, // ng-view name, retained internally for nested view matching
                    _fqn: parentFqn ? `${parentFqn}.${name}` : name, // fully qualified name, describes location in DOM
                    _config: null,
                    _configUpdated: configUpdatedCallback,
                    get _creationContext() {
                        return (inheritedContext ??
                            inherited.$ngView._creationContext ??
                            rootContext);
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
                    activeNgView._config = config;
                    viewConfig = config;
                    updateView(config);
                }
                setCacheData($element, "$ngView", { $ngView: activeNgView });
                const unregister = $view._registerNgView(activeNgView);
                if (!viewConfig) {
                    updateView();
                }
                scope.$on("$destroy", function () {
                    unregister();
                });
                function cleanupLastView() {
                    const destroyedScope = currentScope;
                    if (currentScope) {
                        currentScope.$destroy();
                        currentScope = null;
                    }
                    if (currentEl) {
                        const _viewData = getCacheData(currentEl, "$ngViewAnim");
                        const elementScope = getInheritedData(currentEl, "$scope");
                        if (destroyedScope &&
                            elementScope &&
                            elementScope !== destroyedScope &&
                            elementScope.$parent === destroyedScope &&
                            !elementScope.$handler._destroyed) {
                            elementScope.$destroy();
                        }
                        removeElement(currentEl);
                        _viewData?.$$animLeave.resolve(undefined);
                        currentEl = null;
                    }
                }
                function updateView(config) {
                    const newScope = scope.$new();
                    const animEnter = withResolvers();
                    const animLeave = withResolvers();
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
                    let enteredNodes = [];
                    transclude(newScope, (clone) => {
                        const elementClone = getFirstElementFromClone(clone);
                        const cloneNodes = getRootNodesFromClone(clone);
                        if (!elementClone) {
                            return;
                        }
                        initialTemplate ?? (initialTemplate = elementClone.innerHTML);
                        const viewData = {
                            $cfg: config,
                            $ngView: activeNgView,
                        };
                        for (let i = 0; i < cloneNodes.length; i++) {
                            const node = cloneNodes[i];
                            setCacheData(node, "$ngViewAnim", $ngViewAnim);
                            setCacheData(node, "$ngView", viewData);
                        }
                        enteredElement = elementClone;
                        enteredNodes = cloneNodes;
                        $element.after(elementClone);
                        animEnter.resolve(undefined);
                        cleanupLastView();
                        currentEl = elementClone;
                        currentScope = newScope;
                        if ((isDefined(autoScrollExp) && !autoScrollExp) ||
                            (autoScrollExp && autoScrollFn?.(scope))) {
                            $anchorScroll(elementClone);
                        }
                    });
                    if (currentScope !== newScope)
                        return;
                    if (newScope.$handler._destroyed) {
                        return;
                    }
                    const host = assertDefined(enteredElement);
                    const viewData = getCacheData(host, "$ngView");
                    $view._fillView({
                        host,
                        rootNodes: enteredNodes,
                        scope: newScope,
                        config,
                        initial: viewData?.$initial ?? initialTemplate ?? "",
                        activeNgView,
                        animation: $ngViewAnim,
                    });
                    newScope.$emit("$viewContentAnimationEnded");
                    /**
                     * Fired once the view is **loaded**, *after* the DOM is rendered.
                     *
                     * @param event Event object.
                     */
                    newScope.$emit("$viewContentLoaded", config ?? viewConfig);
                    onloadFn?.(newScope);
                }
            };
        },
    };
    return directive;
}
/**
 * Clears stale fallback content before a routed `ng-view` clone links children.
 *
 * The mounted view is filled later by `ViewService`; this guard only preserves
 * the old two-directive transclusion ordering without owning view rendering.
 */
function ViewDirectiveContentGuard() {
    return {
        priority: -400,
        compile(tElement) {
            const initial = tElement.innerHTML;
            return {
                pre(_scope, $element) {
                    const data = getCacheData($element, "$ngView");
                    if (data) {
                        data.$initial ?? (data.$initial = initial);
                    }
                    if (data?.$cfg && !data.$filled) {
                        dealoc($element, true);
                    }
                },
            };
        },
    };
}

export { ViewDirective, ViewDirectiveContentGuard };
