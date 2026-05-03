import { _state, _rootScope, _stateRegistry, _transitions, _parse, _router, _interpolate } from '../../injection-tokens.js';
import { removeFrom } from '../../shared/common.js';
import { isObject, keys, isString, isArray, assign, arrayFrom, isNullOrUndefined } from '../../shared/utils.js';
import { getInheritedData } from '../../shared/dom.js';

const noopDeregister = () => undefined;
const uniqueStrings = (classes) => arrayFrom(new Set(classes));
function appendSplitClasses(classes, value) {
    const split = value.split(/\s/);
    split.forEach((className) => {
        if (className)
            classes.push(className);
    });
}
function getClasses(stateList) {
    const classes = [];
    stateList.forEach((state) => appendSplitClasses(classes, state._activeClass));
    return classes;
}
function appendUniqueClasses(target, source) {
    source.forEach((className) => {
        if (!target.includes(className))
            target.push(className);
    });
}
/**
 * Parses an `ng-sref` expression into a target state name and parameter expression.
 */
function parseStateRef(ref) {
    const paramsOnly = ref.match(/^\s*({[^}]*})\s*$/);
    if (paramsOnly)
        ref = `(${paramsOnly[1]})`;
    const parsed = ref
        .replace(/\n/g, " ")
        .match(/^\s*([^(]*?)\s*(\((.*)\))?\s*$/);
    if (!parsed || parsed.length !== 4)
        throw new Error(`Invalid state ref '${ref}'`);
    return { _state: parsed[1] || null, _paramExpr: parsed[3] || null };
}
/**
 * Resolves the relative state context for a state-ref-bearing element.
 */
function stateContext(el) {
    const $ngView = getInheritedData(el, "$ngView");
    const path = $ngView?.$cfg
        ?._path;
    return path ? path[path.length - 1].state.name : undefined;
}
/**
 * Computes the current state-ref definition, href, and navigation options.
 */
function processedDef($state, $element, def) {
    const ngState = (def._ngState || $state.current?.name);
    const ngStateOpts = assign(defaultOpts($element, $state), def._ngStateOpts || {});
    const href = ngState
        ? $state.href(ngState, def._ngStateParams, ngStateOpts)
        : undefined;
    return {
        _ngState: ngState,
        _ngStateParams: def._ngStateParams,
        _ngStateOpts: ngStateOpts,
        _href: href,
    };
}
/**
 * Returns the relevant DOM attribute and click behavior metadata for the element.
 */
function getTypeInfo(el) {
    // SVG 2 uses the standard `href` attribute; `xlink:href` is obsolete.
    const isForm = el.nodeName === "FORM";
    return {
        _attr: isForm ? "action" : "href",
        _isAnchor: el.nodeName === "A",
        _clickable: !isForm,
    };
}
/**
 * Creates the click handler that triggers a state transition for a state ref.
 */
function clickHook(el, $state, type, rawDef, scope) {
    return function (event) {
        const mouseEvent = event;
        const { button } = mouseEvent;
        const target = processedDef($state, el, rawDef);
        const res = button > 1 ||
            mouseEvent.ctrlKey ||
            mouseEvent.metaKey ||
            mouseEvent.shiftKey ||
            mouseEvent.altKey ||
            el.getAttribute("target");
        if (!res) {
            const originalPreventDefault = event.preventDefault.bind(event);
            let cancelled = false;
            let ignorePreventDefaultCount = type._isAnchor && !target._href ? 1 : 0;
            event.preventDefault = function () {
                originalPreventDefault();
                if (ignorePreventDefaultCount-- <= 0) {
                    cancelled = true;
                }
            };
            originalPreventDefault();
            queueMicrotask(() => {
                event.preventDefault = originalPreventDefault;
                if (cancelled) {
                    return;
                }
                if (!el.getAttribute("disabled") && target._ngState) {
                    $state
                        .go(target._ngState, target._ngStateParams, target._ngStateOpts)
                        .then(() => {
                        scope.$emit("$updateBrowser");
                    });
                }
            });
        }
        else {
            // ignored
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };
}
/**
 * Produces default navigation options for a state-ref element.
 */
function defaultOpts(el, $state) {
    return {
        relative: stateContext(el) || $state.$current,
        inherit: true,
        source: "sref",
    };
}
/**
 * Binds the configured activation events and removes them on scope destroy.
 */
function bindEvents(element, scope, hookFn, ngStateOpts) {
    let events = ngStateOpts ? ngStateOpts.events : undefined;
    if (!isArray(events)) {
        events = ["click"];
    }
    const eventNames = events;
    //const on = element.on ? "on" : "bind";
    for (const event of eventNames) {
        element.addEventListener(event, hookFn);
    }
    scope.$on("$destroy", function () {
        // const off = element.off ? "off" : "unbind";
        for (const event of eventNames) {
            element.removeEventListener(event, hookFn);
        }
    });
}
// // TODO: SEPARATE THESE OUT
StateRefDirective.$inject = [
    _state,
    _rootScope,
    _stateRegistry,
    _transitions,
    _parse,
];
/**
 * Generates `ng-sref` links and keeps their href/state data in sync.
 */
function StateRefDirective($stateService, $rootScope, $stateRegistry, $transitions, $parse) {
    const $state = $stateService;
    return {
        restrict: "A",
        require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
        link: (scope, element, attrs, ngSrefActive) => {
            const type = getTypeInfo(element);
            const active = ngSrefActive[1] || ngSrefActive[0];
            let unlinkInfoFn;
            const rawDef = {};
            const ref = parseStateRef(attrs.ngSref);
            const ngStateOptsFn = attrs.ngSrefOpts
                ? $parse(attrs.ngSrefOpts)
                : undefined;
            const paramFn = ref._paramExpr ? $parse(ref._paramExpr) : undefined;
            rawDef._ngState = ref._state;
            rawDef._ngStateOpts = ngStateOptsFn ? ngStateOptsFn(scope) : {};
            function update() {
                rawDef._ngStateParams = assign({}, paramFn && paramFn(scope));
                const def = processedDef($state, element, rawDef);
                if (unlinkInfoFn) {
                    unlinkInfoFn();
                }
                if (active) {
                    unlinkInfoFn = active?._addStateInfo?.(def._ngState || null, def._ngStateParams);
                }
                if (!isNullOrUndefined(def._href)) {
                    attrs.$set(type._attr, def._href);
                }
            }
            if (ref._paramExpr) {
                scope.$watch(ref._paramExpr, function (val) {
                    rawDef._ngStateParams = assign({}, val);
                    update();
                }, true);
                rawDef._ngStateParams = assign({}, paramFn?.(scope));
            }
            update();
            scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
            scope.$on("$destroy", $transitions.onSuccess({}, update));
            if (!type._clickable) {
                return;
            }
            bindEvents(element, scope, clickHook(element, $state, type, rawDef, $rootScope), rawDef._ngStateOpts);
        },
    };
}
StateRefDynamicDirective.$inject = [
    _state,
    _rootScope,
    _stateRegistry,
    _transitions,
    _parse,
];
/**
 * Generates dynamic `ui-state` links whose target state is read from an expression.
 */
function StateRefDynamicDirective($state, $rootScope, $stateRegistry, $transitions, $parse) {
    return {
        restrict: "A",
        require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
        link(scope, element, attrs, ngSrefActive) {
            const type = getTypeInfo(element);
            const active = ngSrefActive[1] || ngSrefActive[0];
            let unlinkInfoFn;
            const rawDef = {};
            const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"];
            const rawDefKeyByAttr = {
                ngState: "_ngState",
                ngStateParams: "_ngStateParams",
                ngStateOpts: "_ngStateOpts",
            };
            const watchDeregFns = {};
            inputAttrs.forEach((attr) => {
                watchDeregFns[attr] = () => {
                    /* empty */
                };
            });
            function update() {
                const def = processedDef($state, element, rawDef);
                if (unlinkInfoFn) {
                    unlinkInfoFn();
                }
                if (active) {
                    unlinkInfoFn = active?._addStateInfo?.(def._ngState || null, def._ngStateParams);
                }
                if (!isNullOrUndefined(def._href)) {
                    attrs.$set(type._attr, def._href);
                }
            }
            inputAttrs.forEach((field) => {
                rawDef[rawDefKeyByAttr[field]] = attrs[field]
                    ? $parse(attrs[field])(scope)
                    : null;
                attrs.$observe(field, (expr) => {
                    watchDeregFns[field]();
                    if (!expr)
                        return;
                    watchDeregFns[field] =
                        scope.$watch(expr, (newval) => {
                            rawDef[rawDefKeyByAttr[field]] = newval;
                            update();
                        }) || noopDeregister;
                });
            });
            update();
            scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
            scope.$on("$destroy", $transitions.onSuccess({}, update));
            if (!type._clickable)
                return;
            const hookFn = clickHook(element, $state, type, rawDef, $rootScope);
            bindEvents(element, scope, hookFn, rawDef._ngStateOpts);
        },
    };
}
StateRefActiveDirective.$inject = [
    _state,
    _router,
    _interpolate,
    _stateRegistry,
    _transitions,
    _parse,
];
/**
 * Toggles active CSS classes based on the current router state.
 */
function StateRefActiveDirective($state, $routerState, $interpolate, $stateRegistry, $transitions, $parse) {
    return {
        restrict: "A",
        controller($scope, $element, $attrs) {
            let states = [];
            let ngSrefActive;
            // There probably isn't much point in $observing this
            // ngSrefActive and ngSrefActiveEq share the same directive object with some
            // slight difference in logic routing
            const activeEqClass = $interpolate($attrs.ngSrefActiveEq || "", false)($scope) || "";
            try {
                ngSrefActive = $attrs.ngSrefActive
                    ? $parse($attrs.ngSrefActive)($scope)
                    : undefined;
            }
            catch {
                // Do nothing. ngSrefActive is not a valid expression.
                // Fall back to using $interpolate below
            }
            ngSrefActive =
                ngSrefActive ||
                    $interpolate($attrs.ngSrefActive || "", false)($scope) ||
                    "";
            setStatesFromDefinitionObject(ngSrefActive);
            // Allow ngSref to communicate with ngSrefActive[Equals]
            this._addStateInfo = function (newState, newParams) {
                // we already got an explicit state provided by ng-sref-active, so we
                // shadow the one that comes from ng-sref
                if (isObject(ngSrefActive) && states.length > 0) {
                    return undefined;
                }
                const deregister = addState(newState, newParams, String(ngSrefActive));
                update();
                return deregister;
            };
            /**
             * Updates active classes after a transition settles.
             */
            function updateAfterTransition(trans) {
                trans.promise.then(update, () => {
                    /* empty */
                });
            }
            $scope.$on("$destroy", setupEventListeners());
            if ($routerState._transition) {
                updateAfterTransition($routerState._transition);
            }
            function setupEventListeners() {
                const deregisterStatesChangedListener = $stateRegistry.onStatesChanged(handleStatesChanged);
                const deregisterOnStartListener = $transitions.onStart({}, updateAfterTransition);
                const deregisterStateChangeSuccessListener = $scope.$on("$stateChangeSuccess", update);
                return function cleanUp() {
                    deregisterStatesChangedListener();
                    deregisterOnStartListener();
                    deregisterStateChangeSuccessListener();
                };
            }
            function handleStatesChanged() {
                setStatesFromDefinitionObject(ngSrefActive);
            }
            /** Updates the tracked state list from the directive definition object. */
            function setStatesFromDefinitionObject(statesDefinition) {
                if (isObject(statesDefinition)) {
                    states = [];
                    const definition = statesDefinition;
                    keys(definition).forEach((activeClass) => {
                        const stateOrName = definition[activeClass];
                        if (isString(stateOrName)) {
                            addStateForClass(stateOrName, activeClass);
                        }
                        else if (isArray(stateOrName)) {
                            stateOrName.forEach((stateName) => {
                                addStateForClass(stateName, activeClass);
                            });
                        }
                    });
                }
            }
            function addStateForClass(stateOrNameParam, activeClassParam) {
                const ref = parseStateRef(stateOrNameParam);
                addState(ref._state, ref._paramExpr && $parse(ref._paramExpr)($scope), activeClassParam);
            }
            function addState(stateName, stateParams, activeClass) {
                const state = stateName
                    ? $state.get(stateName, stateContext($element))
                    : undefined;
                const foundState = !isArray(state) ? state : undefined;
                const stateInfo = {
                    _state: {
                        name: foundState?.name ||
                            (isObject(stateName) && "name" in stateName
                                ? String(stateName.name)
                                : String(stateName)),
                    },
                    _params: stateParams,
                    _activeClass: activeClass,
                };
                states.push(stateInfo);
                return function removeState() {
                    removeFrom(states, stateInfo);
                };
            }
            // Update route state
            function update() {
                const allClasses = getClasses(states);
                appendSplitClasses(allClasses, activeEqClass);
                const fuzzyStates = [];
                let exactlyMatchesAny = false;
                states.forEach((state) => {
                    if ($state.includes(state._state.name, state._params)) {
                        fuzzyStates.push(state);
                    }
                    if ($state.is(state._state.name, state._params)) {
                        exactlyMatchesAny = true;
                    }
                });
                const fuzzyClasses = getClasses(fuzzyStates);
                const exactClasses = [];
                if (exactlyMatchesAny) {
                    appendSplitClasses(exactClasses, activeEqClass);
                }
                const addClasses = uniqueStrings(fuzzyClasses);
                appendUniqueClasses(addClasses, exactClasses);
                const removeClasses = [];
                const uniqueClasses = uniqueStrings(allClasses);
                uniqueClasses.forEach((cls) => {
                    if (!addClasses.includes(cls)) {
                        removeClasses.push(cls);
                    }
                });
                addClasses.forEach((className) => {
                    $element.classList.add(className);
                });
                removeClasses.forEach((className) => {
                    $element.classList.remove(className);
                });
            }
            update();
        },
    };
}

export { StateRefActiveDirective, StateRefDirective, StateRefDynamicDirective };
