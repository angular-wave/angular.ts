import { _scope, _element, _aria, _state, _rootScope, _stateRegistry, _transitions, _parse, _interpolate } from '../../injection-tokens.js';
import { removeFrom } from '../../shared/common.js';
import { stringify, assertDefined, isObject, keys, isString, isArray, directiveNormalize, arrayFrom, isNullOrUndefined, assign } from '../../shared/utils.js';
import { getNormalizedAttr, getInheritedData, setNormalizedAttr, hasNormalizedAttr } from '../../shared/dom.js';

const noopDeregister = () => undefined;
const uniqueStrings = (classes) => arrayFrom(new Set(classes));
const ACTIVE_REQUIREMENTS = [
    "?^ngStateActiveExact",
    "?^ngStateActive",
];
const DATA_STATE_CURRENT = "data-state-current";
const isRouteLinkAriaDisabled = (element) => hasNormalizedAttr(element, "ngAriaDisable");
function selectActiveController(controllers) {
    return controllers[0] ?? controllers[1];
}
function getFirstNormalizedAttr(element, names) {
    for (const name of names) {
        const value = getNormalizedAttr(element, name);
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}
function hasDataStateModifier(element, modifier) {
    return getNormalizedAttr(element, modifier) !== undefined;
}
function setDataStateCurrent(element, currentState, isCurrent) {
    currentState._managed = true;
    element.setAttribute(DATA_STATE_CURRENT, String(isCurrent));
}
function updateDataStateCurrent($state, element, rawDef, currentState) {
    const tracksActive = hasDataStateModifier(element, "stateActive");
    const tracksExact = hasDataStateModifier(element, "stateExact");
    if (!tracksActive && !tracksExact) {
        if (currentState._managed) {
            element.removeAttribute(DATA_STATE_CURRENT);
            currentState._managed = false;
        }
        return undefined;
    }
    const def = processedDef($state, element, rawDef);
    const stateName = def._ngState;
    if (!stateName) {
        setDataStateCurrent(element, currentState, false);
        return false;
    }
    const params = def._ngStateParams;
    const isCurrent = $state.matches(stateName, params, { exact: tracksExact });
    setDataStateCurrent(element, currentState, isCurrent);
    return isCurrent;
}
function appendSplitClasses(classes, value) {
    const split = value.split(/\s/);
    split.forEach((className) => {
        if (className)
            classes.push(className);
    });
}
function getClasses(stateList) {
    const classes = [];
    stateList.forEach((state) => {
        appendSplitClasses(classes, state._activeClass);
    });
    return classes;
}
function appendUniqueClasses(target, source) {
    source.forEach((className) => {
        if (!target.includes(className))
            target.push(className);
    });
}
/**
 * Parses a state ref expression into a target state name and parameter expression.
 */
function parseStateRef(ref) {
    const normalizedRef = normalizeParamsOnlyStateRef(ref).replace(/\n/g, " ");
    const trimmedRef = normalizedRef.trim();
    const openParenIndex = trimmedRef.indexOf("(");
    if (openParenIndex === -1) {
        return { _state: trimmedRef || null, _paramExpr: null };
    }
    const closeParenIndex = trimmedRef.lastIndexOf(")");
    if (closeParenIndex !== trimmedRef.length - 1) {
        throw new Error(`Invalid state ref '${ref}'`);
    }
    return {
        _state: trimmedRef.slice(0, openParenIndex).trimEnd() || null,
        _paramExpr: trimmedRef.slice(openParenIndex + 1, closeParenIndex) || null,
    };
}
function normalizeParamsOnlyStateRef(ref) {
    const trimmedRef = ref.trim();
    if (trimmedRef.startsWith("{") &&
        trimmedRef.endsWith("}") &&
        trimmedRef.indexOf("}") === trimmedRef.length - 1) {
        return `(${trimmedRef})`;
    }
    return ref;
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
    const ngState = def._ngState ?? $state.current?.name;
    const ngStateOpts = assign(defaultOpts($element, $state), def._ngStateOpts ?? {});
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
        _isButton: el.nodeName === "BUTTON",
        _clickable: !isForm,
    };
}
function applyRouteLinkAriaDefaults($aria, element, type) {
    if (isRouteLinkAriaDisabled(element) || type._isAnchor || type._isButton) {
        return;
    }
    if ($aria.config("bindRoleForState") && !element.hasAttribute("role")) {
        element.setAttribute("role", "link");
    }
    if ($aria.config("tabindex") && !element.hasAttribute("tabindex")) {
        element.setAttribute("tabindex", "0");
    }
}
function updateRouteLinkAriaCurrent($aria, element, currentState, isCurrent) {
    if (isRouteLinkAriaDisabled(element) ||
        !$aria.config("ariaCurrent") ||
        isCurrent === undefined) {
        if (currentState._managedAriaCurrent) {
            element.removeAttribute("aria-current");
            currentState._managedAriaCurrent = false;
        }
        return;
    }
    if (isCurrent) {
        if (currentState._managedAriaCurrent ||
            !element.hasAttribute("aria-current")) {
            element.setAttribute("aria-current", $aria.config("ariaCurrentToken"));
            currentState._managedAriaCurrent = true;
        }
        return;
    }
    if (currentState._managedAriaCurrent) {
        element.removeAttribute("aria-current");
        currentState._managedAriaCurrent = false;
    }
}
/**
 * Creates the click handler that triggers a state transition for a state ref.
 */
function clickHook(el, $state, type, rawDef, scope) {
    return function (event) {
        const mouseEvent = event;
        const { button } = mouseEvent;
        const target = processedDef($state, el, rawDef);
        const res = button > 0 ||
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
                    void $state
                        .go(target._ngState, target._ngStateParams, target._ngStateOpts)
                        .then(() => {
                        scope.$emit("$updateBrowser");
                        return undefined;
                    })
                        .catch(() => undefined);
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
        relative: stateContext(el) ?? $state.$current,
        inherit: true,
        source: "ng-state",
    };
}
/**
 * Binds the configured activation events and removes them on scope destroy.
 */
function bindEvents(element, scope, hookFn, keyboardHookFn, ngStateOpts) {
    let events = ngStateOpts ? ngStateOpts.events : undefined;
    if (!isArray(events)) {
        events = ["click"];
    }
    const eventNames = events;
    //const on = element.on ? "on" : "bind";
    for (const event of eventNames) {
        element.addEventListener(event, hookFn);
    }
    if (keyboardHookFn) {
        element.addEventListener("keydown", keyboardHookFn);
    }
    scope.$on("$destroy", function () {
        // const off = element.off ? "off" : "unbind";
        for (const event of eventNames) {
            element.removeEventListener(event, hookFn);
        }
        if (keyboardHookFn) {
            element.removeEventListener("keydown", keyboardHookFn);
        }
    });
}
function createKeyboardRouteLinkHook(hookFn) {
    return function (event) {
        const keyboardEvent = event;
        if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
            return;
        }
        hookFn(event);
    };
}
StateRefDynamicDirective.$inject = [
    _aria,
    _state,
    _rootScope,
    _stateRegistry,
    _transitions,
    _parse,
];
/**
 * Generates dynamic `ui-state` links whose target state is read from an expression.
 */
function StateRefDynamicDirective($aria, $state, $rootScope, $stateRegistry, $transitions, $parse) {
    return {
        restrict: "A",
        require: ACTIVE_REQUIREMENTS,
        link(scope, element, activeControllers) {
            const type = getTypeInfo(element);
            const active = selectActiveController(activeControllers);
            let unlinkInfoFn;
            const rawDef = {};
            const dataStateCurrent = {
                _managed: false,
                _managedAriaCurrent: false,
            };
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
                if (active?._addStateInfo) {
                    unlinkInfoFn = active._addStateInfo(def._ngState ?? null, def._ngStateParams);
                }
                if (!isNullOrUndefined(def._href)) {
                    setNormalizedAttr(element, type._attr, def._href);
                }
                const isCurrent = updateDataStateCurrent($state, element, rawDef, dataStateCurrent);
                updateRouteLinkAriaCurrent($aria, element, dataStateCurrent, isCurrent);
            }
            inputAttrs.forEach((field) => {
                function readFieldExpression() {
                    return getNormalizedAttr(element, field);
                }
                const initialExpr = readFieldExpression();
                rawDef[rawDefKeyByAttr[field]] =
                    initialExpr && !initialExpr.includes("{{")
                        ? $parse(initialExpr)(scope)
                        : undefined;
                const syncFieldExpression = () => {
                    const expr = readFieldExpression();
                    watchDeregFns[field]();
                    if (!expr || expr.includes("{{")) {
                        return;
                    }
                    watchDeregFns[field] =
                        scope.$watch(expr, (newval) => {
                            rawDef[rawDefKeyByAttr[field]] =
                                newval;
                            update();
                        }) ?? noopDeregister;
                };
                syncFieldExpression();
                const observerName = directiveNormalize(field);
                const observer = new MutationObserver((mutations) => {
                    for (let i = 0; i < mutations.length; i++) {
                        const attributeName = mutations[i].attributeName;
                        if (attributeName &&
                            directiveNormalize(attributeName) === observerName) {
                            syncFieldExpression();
                        }
                    }
                });
                observer.observe(element, { attributes: true });
                let deregisterDestroy = scope.$on("$destroy", deregister);
                function deregister() {
                    observer.disconnect();
                    deregisterDestroy?.();
                    deregisterDestroy = undefined;
                }
            });
            const modifierNames = new Set([
                directiveNormalize("stateActive"),
                directiveNormalize("stateExact"),
                directiveNormalize("ngAriaDisable"),
            ]);
            const modifierObserver = new MutationObserver((mutations) => {
                if (mutations.some(({ attributeName }) => attributeName &&
                    modifierNames.has(directiveNormalize(attributeName)))) {
                    update();
                }
            });
            modifierObserver.observe(element, { attributes: true });
            scope.$on("$destroy", () => {
                modifierObserver.disconnect();
            });
            update();
            scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
            scope.$on("$destroy", $transitions.onSuccess({}, update));
            if (!type._clickable)
                return;
            applyRouteLinkAriaDefaults($aria, element, type);
            const hookFn = clickHook(element, $state, type, rawDef, $rootScope);
            const keyboardHookFn = !isRouteLinkAriaDisabled(element) &&
                !type._isAnchor &&
                !type._isButton &&
                $aria.config("bindKeydown")
                ? createKeyboardRouteLinkHook(hookFn)
                : undefined;
            bindEvents(element, scope, hookFn, keyboardHookFn, rawDef._ngStateOpts);
        },
    };
}
StateRefActiveDirective.$inject = [
    _state,
    _interpolate,
    _stateRegistry,
    _transitions,
    _parse,
];
/**
 * Toggles active CSS classes based on the current router state.
 */
function StateRefActiveDirective($state, $interpolate, $stateRegistry, $transitions, $parse) {
    const routerState = $state._routerState;
    return {
        restrict: "A",
        controller: [
            _scope,
            _element,
            function ($scope, $element) {
                let states = [];
                let activeDefinition;
                const activeEqRead = getFirstNormalizedAttr($element, [
                    "ngStateActiveExact",
                ]);
                const activeEqExpr = activeEqRead ?? "";
                const activeEqClass = stringify(assertDefined($interpolate(activeEqExpr, false))($scope) ?? "");
                const activeRead = getFirstNormalizedAttr($element, ["ngStateActive"]);
                const activeExpr = activeRead;
                try {
                    activeDefinition = activeExpr
                        ? $parse(activeExpr)($scope)
                        : undefined;
                }
                catch {
                    // Do nothing. The active directive value is not a valid expression.
                    // Fall back to using $interpolate below
                }
                activeDefinition =
                    activeDefinition ??
                        stringify(assertDefined($interpolate(activeExpr ?? "", false))($scope) ?? "");
                setStatesFromDefinitionObject(activeDefinition);
                // Allow state-ref directives to communicate with active-state directives.
                this._addStateInfo = function (newState, newParams) {
                    // An explicit state map shadows the state inferred from a linked child.
                    if (isObject(activeDefinition) && states.length > 0) {
                        return undefined;
                    }
                    const deregister = addState(newState, newParams, String(activeDefinition));
                    update();
                    return deregister;
                };
                /**
                 * Updates active classes after a transition settles.
                 */
                function updateAfterTransition(trans) {
                    void trans.promise
                        .then(() => {
                        update();
                        return undefined;
                    })
                        .catch(() => undefined);
                }
                $scope.$on("$destroy", setupEventListeners());
                if (routerState._transition) {
                    updateAfterTransition(routerState._transition);
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
                    setStatesFromDefinitionObject(activeDefinition);
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
                    const foundState = state;
                    const stateInfo = {
                        _state: {
                            name: foundState?.name ??
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
                    const exactlyMatchesAny = states.some((state) => $state.matches(state._state.name, state._params, {
                        exact: true,
                    }));
                    states.forEach((state) => {
                        if ($state.matches(state._state.name, state._params)) {
                            fuzzyStates.push(state);
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
                return undefined;
            },
        ],
    };
}

export { StateRefActiveDirective, StateRefDynamicDirective };
