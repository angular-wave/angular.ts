import {
  _aria,
  _element,
  _interpolate,
  _parse,
  _rootScope,
  _scope,
  _state,
  _stateRegistry,
  _transitions,
} from "../../injection-tokens.ts";
import { removeFrom } from "../../shared/common.ts";
import {
  assign,
  arrayFrom,
  assertDefined,
  directiveNormalize,
  isArray,
  isNullOrUndefined,
  isObject,
  isString,
  keys,
  stringify,
} from "../../shared/utils.ts";
import {
  getInheritedData,
  getNormalizedAttr,
  hasNormalizedAttr,
  setNormalizedAttr,
} from "../../shared/dom.ts";
import type { AriaService } from "../../directive/aria/aria.ts";
import type { RawParams } from "../params/interface.ts";
import type { StateOrName } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { StateRegistryRuntime } from "../state/state-registry.ts";
import type { StateRuntime } from "../state/state-service.ts";
import type {
  InternalTransitionOptions,
  TransitionOptions,
} from "../transition/interface.ts";

interface ParsedStateRef {
  _state: string | null;
  _paramExpr: string | null;
}

type StateRefOptions = InternalTransitionOptions & { events?: string[] };

interface ProcessedDef {
  _ngState: StateOrName | undefined;
  _ngStateParams: RawParams | undefined;
  _ngStateOpts: StateRefOptions;
  _href: string | null | undefined;
}

interface StateRefDefinition {
  _ngState?: StateOrName | null;
  _ngStateParams?: RawParams;
  _ngStateOpts?: StateRefOptions;
}

interface TypeInfo {
  _attr: string;
  _isAnchor: boolean;
  _isButton: boolean;
  _clickable: boolean;
}

interface StateCurrentState {
  _managed: boolean;
  _managedAriaCurrent: boolean;
}

interface ActiveClassState {
  _state: { name: string };
  _params: unknown;
  _activeClass: string;
}

interface StateRefActiveController {
  /** @internal */
  _addStateInfo?: (
    newState: StateOrName | null,
    newParams: unknown,
  ) => (() => void) | undefined;
}

type WatchDeregFns = Record<string, () => void>;

const noopDeregister = () => undefined;

const uniqueStrings = (classes: string[]): string[] =>
  arrayFrom(new Set(classes));

const ACTIVE_REQUIREMENTS: string[] = [
  "?^ngStateActiveExact",
  "?^ngStateActive",
];

const DATA_STATE_CURRENT = "data-state-current";

const isRouteLinkAriaDisabled = (element: HTMLElement): boolean =>
  hasNormalizedAttr(element, "ngAriaDisable");

function selectActiveController(
  controllers: ArrayLike<StateRefActiveController | undefined>,
): StateRefActiveController | undefined {
  return controllers[0] ?? controllers[1];
}

function getFirstNormalizedAttr(
  element: HTMLElement,
  names: string[],
): string | undefined {
  for (const name of names) {
    const value = getNormalizedAttr(element, name);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function hasDataStateModifier(element: HTMLElement, modifier: string): boolean {
  return getNormalizedAttr(element, modifier) !== undefined;
}

function setDataStateCurrent(
  element: HTMLElement,
  currentState: StateCurrentState,
  isCurrent: boolean,
): void {
  currentState._managed = true;
  element.setAttribute(DATA_STATE_CURRENT, String(isCurrent));
}

function updateDataStateCurrent(
  $state: StateRuntime,
  element: HTMLElement,
  rawDef: StateRefDefinition,
  currentState: StateCurrentState,
): boolean | undefined {
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

function appendSplitClasses(classes: string[], value: string): void {
  const split = value.split(/\s/);

  split.forEach((className) => {
    if (className) classes.push(className);
  });
}

function getClasses(stateList: ActiveClassState[]): string[] {
  const classes: string[] = [];

  stateList.forEach((state) => {
    appendSplitClasses(classes, state._activeClass);
  });

  return classes;
}

function appendUniqueClasses(target: string[], source: string[]): void {
  source.forEach((className) => {
    if (!target.includes(className)) target.push(className);
  });
}

/**
 * Parses a state ref expression into a target state name and parameter expression.
 */
function parseStateRef(ref: string): ParsedStateRef {
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

function normalizeParamsOnlyStateRef(ref: string): string {
  const trimmedRef = ref.trim();

  if (
    trimmedRef.startsWith("{") &&
    trimmedRef.endsWith("}") &&
    trimmedRef.indexOf("}") === trimmedRef.length - 1
  ) {
    return `(${trimmedRef})`;
  }

  return ref;
}

/**
 * Resolves the relative state context for a state-ref-bearing element.
 */
function stateContext(el: Node): string | undefined {
  const $ngView: unknown = getInheritedData(el, "$ngView");

  const path = ($ngView as { $cfg?: { _path?: unknown } } | undefined)?.$cfg
    ?._path as { state: { name: string } }[] | undefined;

  return path ? path[path.length - 1].state.name : undefined;
}

/**
 * Computes the current state-ref definition, href, and navigation options.
 */
function processedDef(
  $state: StateRuntime,
  $element: HTMLElement,
  def: StateRefDefinition,
): ProcessedDef {
  const ngState = def._ngState ?? $state.current?.name;

  const ngStateOpts = assign(
    defaultOpts($element, $state),
    def._ngStateOpts ?? {},
  );

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
function getTypeInfo(el: HTMLElement): TypeInfo {
  // SVG 2 uses the standard `href` attribute; `xlink:href` is obsolete.
  const isForm = el.nodeName === "FORM";

  return {
    _attr: isForm ? "action" : "href",
    _isAnchor: el.nodeName === "A",
    _isButton: el.nodeName === "BUTTON",
    _clickable: !isForm,
  };
}

function applyRouteLinkAriaDefaults(
  $aria: AriaService,
  element: HTMLElement,
  type: TypeInfo,
): void {
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

function updateRouteLinkAriaCurrent(
  $aria: AriaService,
  element: HTMLElement,
  currentState: StateCurrentState,
  isCurrent: boolean | undefined,
): void {
  if (
    isRouteLinkAriaDisabled(element) ||
    !$aria.config("ariaCurrent") ||
    isCurrent === undefined
  ) {
    if (currentState._managedAriaCurrent) {
      element.removeAttribute("aria-current");
      currentState._managedAriaCurrent = false;
    }
    return;
  }

  if (isCurrent) {
    if (
      currentState._managedAriaCurrent ||
      !element.hasAttribute("aria-current")
    ) {
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
function clickHook(
  el: HTMLElement,
  $state: StateRuntime,
  type: TypeInfo,
  rawDef: StateRefDefinition,
  scope: ng.Scope,
): EventListener {
  return function (event: Event): void {
    const mouseEvent = event as MouseEvent;

    const { button } = mouseEvent;

    const target = processedDef($state, el, rawDef);

    const res =
      button > 0 ||
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
    } else {
      // ignored
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
}

/**
 * Produces default navigation options for a state-ref element.
 */
function defaultOpts(
  el: Node,
  $state: { $current: StateObject | undefined },
): StateRefOptions {
  return {
    relative: stateContext(el) ?? $state.$current,
    inherit: true,
    source: "ng-state",
  };
}

/**
 * Binds the configured activation events and removes them on scope destroy.
 */
function bindEvents(
  element: HTMLElement,
  scope: ng.Scope,
  hookFn: EventListener,
  keyboardHookFn: EventListener | undefined,
  ngStateOpts: StateRefOptions | null | undefined,
): void {
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

function createKeyboardRouteLinkHook(hookFn: EventListener): EventListener {
  return function (event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

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
export function StateRefDynamicDirective(
  $aria: AriaService,
  $state: StateRuntime,
  $rootScope: ng.Scope,
  $stateRegistry: StateRegistryRuntime,
  $transitions: ng.TransitionsService,
  $parse: ng.ParseService,
): ng.Directive {
  return {
    restrict: "A",
    require: ACTIVE_REQUIREMENTS,
    link(
      scope: ng.Scope,
      element: HTMLElement,
      activeControllers: ArrayLike<StateRefActiveController | undefined>,
    ) {
      const type = getTypeInfo(element);

      const active = selectActiveController(activeControllers);

      let unlinkInfoFn: (() => void) | undefined;

      const rawDef: StateRefDefinition = {};
      const dataStateCurrent: StateCurrentState = {
        _managed: false,
        _managedAriaCurrent: false,
      };

      const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"] as const;

      const rawDefKeyByAttr = {
        ngState: "_ngState",
        ngStateParams: "_ngStateParams",
        ngStateOpts: "_ngStateOpts",
      } as const;

      const watchDeregFns = {} as WatchDeregFns;

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
          unlinkInfoFn = active._addStateInfo(
            def._ngState ?? null,
            def._ngStateParams,
          );
        }

        if (!isNullOrUndefined(def._href)) {
          setNormalizedAttr(element, type._attr, def._href);
        }

        const isCurrent = updateDataStateCurrent(
          $state,
          element,
          rawDef,
          dataStateCurrent,
        );
        updateRouteLinkAriaCurrent($aria, element, dataStateCurrent, isCurrent);
      }

      inputAttrs.forEach((field) => {
        function readFieldExpression(): string | undefined {
          return getNormalizedAttr(element, field);
        }

        const initialExpr = readFieldExpression();

        (rawDef as Record<string, unknown>)[rawDefKeyByAttr[field]] =
          initialExpr && !initialExpr.includes("{{")
            ? ($parse(initialExpr)(scope) as TransitionOptions & RawParams)
            : undefined;

        const syncFieldExpression = () => {
          const expr = readFieldExpression();

          watchDeregFns[field]();

          if (!expr || expr.includes("{{")) {
            return;
          }

          watchDeregFns[field] =
            scope.$watch(expr, (newval) => {
              (rawDef as Record<string, unknown>)[rawDefKeyByAttr[field]] =
                newval;
              update();
            }) ?? noopDeregister;
        };

        syncFieldExpression();
        const observerName = directiveNormalize(field);
        const observer = new MutationObserver((mutations) => {
          for (let i = 0; i < mutations.length; i++) {
            const attributeName = mutations[i].attributeName;

            if (
              attributeName &&
              directiveNormalize(attributeName) === observerName
            ) {
              syncFieldExpression();
            }
          }
        });
        observer.observe(element, { attributes: true });

        let deregisterDestroy: (() => void) | undefined = scope.$on(
          "$destroy",
          deregister,
        );

        function deregister(): void {
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
        if (
          mutations.some(
            ({ attributeName }) =>
              attributeName &&
              modifierNames.has(directiveNormalize(attributeName)),
          )
        ) {
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

      if (!type._clickable) return;
      applyRouteLinkAriaDefaults($aria, element, type);
      const hookFn = clickHook(element, $state, type, rawDef, $rootScope);
      const keyboardHookFn =
        !isRouteLinkAriaDisabled(element) &&
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
export function StateRefActiveDirective(
  $state: StateRuntime,
  $interpolate: ng.InterpolateService,
  $stateRegistry: StateRegistryRuntime,
  $transitions: ng.TransitionsService,
  $parse: ng.ParseService,
): ng.Directive {
  const routerState = $state._routerState;

  return {
    restrict: "A",
    controller: [
      _scope,
      _element,
      function (
        this: StateRefActiveController,
        $scope: ng.Scope,
        $element: HTMLElement,
      ): undefined {
        let states: ActiveClassState[] = [];

        let activeDefinition: unknown;

        const activeEqRead = getFirstNormalizedAttr($element, [
          "ngStateActiveExact",
        ]);

        const activeEqExpr = activeEqRead ?? "";

        const activeEqClass = stringify(
          assertDefined($interpolate(activeEqExpr, false))($scope) ?? "",
        );

        const activeRead = getFirstNormalizedAttr($element, ["ngStateActive"]);

        const activeExpr = activeRead;

        try {
          activeDefinition = activeExpr
            ? $parse(activeExpr)($scope)
            : undefined;
        } catch {
          // Do nothing. The active directive value is not a valid expression.
          // Fall back to using $interpolate below
        }
        activeDefinition =
          activeDefinition ??
          stringify(
            assertDefined($interpolate(activeExpr ?? "", false))($scope) ?? "",
          );
        setStatesFromDefinitionObject(activeDefinition);
        // Allow state-ref directives to communicate with active-state directives.
        this._addStateInfo = function (newState, newParams) {
          // An explicit state map shadows the state inferred from a linked child.
          if (isObject(activeDefinition) && states.length > 0) {
            return undefined;
          }
          const deregister = addState(
            newState,
            newParams,
            String(activeDefinition),
          );

          update();

          return deregister;
        };
        /**
         * Updates active classes after a transition settles.
         */
        function updateAfterTransition(trans: ng.Transition): void {
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
          const deregisterStatesChangedListener =
            $stateRegistry.onStatesChanged(handleStatesChanged);

          const deregisterOnStartListener = $transitions.onStart(
            {},
            updateAfterTransition,
          );

          const deregisterStateChangeSuccessListener = $scope.$on(
            "$stateChangeSuccess",
            update,
          );

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
        function setStatesFromDefinitionObject(
          statesDefinition: unknown,
        ): void {
          if (isObject(statesDefinition)) {
            states = [];
            const definition = statesDefinition as Record<string, unknown>;

            keys(definition).forEach((activeClass) => {
              const stateOrName = definition[activeClass];

              if (isString(stateOrName)) {
                addStateForClass(stateOrName, activeClass);
              } else if (isArray(stateOrName)) {
                stateOrName.forEach((stateName) => {
                  addStateForClass(stateName as string, activeClass);
                });
              }
            });
          }
        }
        function addStateForClass(
          stateOrNameParam: string,
          activeClassParam: string,
        ): void {
          const ref = parseStateRef(stateOrNameParam);

          addState(
            ref._state,
            ref._paramExpr && $parse(ref._paramExpr)($scope),
            activeClassParam,
          );
        }
        function addState(
          stateName: StateOrName | null,
          stateParams: unknown,
          activeClass: string,
        ): () => void {
          const state = stateName
            ? $state.get(stateName, stateContext($element))
            : undefined;

          const foundState = state;

          const stateInfo = {
            _state: {
              name:
                foundState?.name ??
                (isObject(stateName) && "name" in stateName
                  ? String((stateName as { name?: unknown }).name)
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

          const fuzzyStates: ActiveClassState[] = [];

          const exactlyMatchesAny = states.some((state) =>
            $state.matches(state._state.name, state._params as RawParams, {
              exact: true,
            }),
          );

          states.forEach((state) => {
            if ($state.matches(state._state.name, state._params as RawParams)) {
              fuzzyStates.push(state);
            }
          });

          const fuzzyClasses = getClasses(fuzzyStates);

          const exactClasses: string[] = [];

          if (exactlyMatchesAny) {
            appendSplitClasses(exactClasses, activeEqClass);
          }

          const addClasses = uniqueStrings(fuzzyClasses);

          appendUniqueClasses(addClasses, exactClasses);

          const removeClasses: string[] = [];

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
