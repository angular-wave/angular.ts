import {
  _interpolate,
  _parse,
  _rootScope,
  _router,
  _state,
  _stateRegistry,
  _transitions,
} from "../../injection-tokens.ts";
import { removeFrom } from "../../shared/common.ts";
import {
  assign,
  arrayFrom,
  entries,
  isArray,
  isNullOrUndefined,
  isObject,
  isString,
} from "../../shared/utils.ts";
import { getInheritedData } from "../../shared/dom.ts";
import type { RawParams } from "../params/interface.ts";
import type { StateOrName } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TransitionOptions } from "../transition/interface.ts";

type ParsedStateRef = { _state: string | null; _paramExpr: string | null };

type StateRefOptions = TransitionOptions & { events?: string[] };

type ProcessedDef = {
  _ngState: StateOrName | undefined;
  _ngStateParams: RawParams | undefined;
  _ngStateOpts: StateRefOptions;
  _href: string | null | undefined;
};

type StateRefDefinition = {
  _ngState?: StateOrName | null;
  _ngStateParams?: RawParams;
  _ngStateOpts?: StateRefOptions;
};

type TypeInfo = {
  _attr: string;
  _isAnchor: boolean;
  _clickable: boolean;
};

type ActiveClassState = {
  _state: { name: string };
  _params: unknown;
  _activeClass: string;
};

type StateRefActiveController = {
  /** @internal */
  _addStateInfo?: (
    newState: StateOrName | null,
    newParams: unknown,
  ) => (() => void) | undefined;
};

type WatchDeregFns = Record<string, () => void>;

const noopDeregister = () => undefined;

const uniqueStrings = (classes: string[]): string[] =>
  arrayFrom(new Set(classes));

function appendSplitClasses(classes: string[], value: string): void {
  const split = value.split(/\s/);

  for (let i = 0; i < split.length; i++) {
    if (split[i]) classes.push(split[i]);
  }
}

function getClasses(stateList: ActiveClassState[]): string[] {
  const classes: string[] = [];

  for (let i = 0; i < stateList.length; i++) {
    appendSplitClasses(classes, stateList[i]._activeClass);
  }

  return classes;
}

/**
 * Parses an `ng-sref` expression into a target state name and parameter expression.
 */
function parseStateRef(ref: string): ParsedStateRef {
  const paramsOnly = ref.match(/^\s*({[^}]*})\s*$/);

  if (paramsOnly) ref = `(${paramsOnly[1]})`;
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
function stateContext(el: Node): string | undefined {
  const $ngView = getInheritedData(el, "$ngView");

  const path = ($ngView as { $cfg?: { path?: unknown } } | undefined)?.$cfg
    ?.path as Array<{ state: { name: string } }> | undefined;

  return path ? path[path.length - 1].state.name : undefined;
}

/**
 * Computes the current state-ref definition, href, and navigation options.
 */
function processedDef(
  $state: ng.StateService,
  $element: HTMLElement,
  def: StateRefDefinition,
): ProcessedDef {
  const ngState = (def._ngState || $state.current?.name) as
    | StateOrName
    | undefined;

  const ngStateOpts = assign(
    defaultOpts($element, $state),
    def._ngStateOpts || {},
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
    _clickable: !isForm,
  };
}

/**
 * Creates the click handler that triggers a state transition for a state ref.
 */
function clickHook(
  el: HTMLElement,
  $state: ng.StateService,
  type: TypeInfo,
  rawDef: StateRefDefinition,
  scope: ng.Scope,
): EventListener {
  return function (event: Event): void {
    const mouseEvent = event as MouseEvent;

    const { button } = mouseEvent;

    const target = processedDef($state, el, rawDef);

    const res =
      button > 1 ||
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
    relative: stateContext(el) || $state.$current,
    inherit: true,
    source: "sref",
  };
}

/**
 * Binds the configured activation events and removes them on scope destroy.
 */
function bindEvents(
  element: HTMLElement,
  scope: ng.Scope,
  hookFn: EventListener,
  ngStateOpts: StateRefOptions | null | undefined,
): void {
  let events = ngStateOpts ? ngStateOpts.events : undefined;

  if (!isArray(events)) {
    events = ["click"];
  }
  const eventNames = events as string[];
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
export function StateRefDirective(
  $stateService: ng.StateService,
  $rootScope: ng.Scope,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
  $parse: ng.ParseService,
): ng.Directive {
  const $state = $stateService;

  return {
    restrict: "A",
    require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
    link: (
      scope: ng.Scope,
      element: HTMLElement,
      attrs: ng.Attributes,
      ngSrefActive: ArrayLike<StateRefActiveController | undefined>,
    ) => {
      const type = getTypeInfo(element);

      const active = ngSrefActive[1] || ngSrefActive[0];

      let unlinkInfoFn: (() => void) | undefined;

      const rawDef: StateRefDefinition = {};

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
          unlinkInfoFn = active?._addStateInfo?.(
            def._ngState || null,
            def._ngStateParams,
          );
        }

        if (!isNullOrUndefined(def._href)) {
          attrs.$set(type._attr, def._href);
        }
      }

      if (ref._paramExpr) {
        scope.$watch(
          ref._paramExpr,
          function (val) {
            rawDef._ngStateParams = assign({}, val);
            update();
          },
          true,
        );
        rawDef._ngStateParams = assign({}, paramFn?.(scope));
      }

      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));

      if (!type._clickable) {
        return;
      }
      bindEvents(
        element,
        scope,
        clickHook(element, $state, type, rawDef, $rootScope),
        rawDef._ngStateOpts,
      );
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
export function StateRefDynamicDirective(
  $state: ng.StateService,
  $rootScope: ng.Scope,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
  $parse: ng.ParseService,
): ng.Directive {
  return {
    restrict: "A",
    require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
    link(
      scope: ng.Scope,
      element: HTMLElement,
      attrs: ng.Attributes,
      ngSrefActive: ArrayLike<StateRefActiveController | undefined>,
    ) {
      const type = getTypeInfo(element);

      const active = ngSrefActive[1] || ngSrefActive[0];

      let unlinkInfoFn: (() => void) | undefined;

      const rawDef: StateRefDefinition = {};

      const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"] as const;

      const rawDefKeyByAttr = {
        ngState: "_ngState",
        ngStateParams: "_ngStateParams",
        ngStateOpts: "_ngStateOpts",
      } as const;

      const watchDeregFns = {} as WatchDeregFns;

      for (let i = 0; i < inputAttrs.length; i++) {
        const attr = inputAttrs[i];

        watchDeregFns[attr] = () => {
          /* empty */
        };
      }

      function update() {
        const def = processedDef($state, element, rawDef);

        if (unlinkInfoFn) {
          unlinkInfoFn();
        }

        if (active) {
          unlinkInfoFn = active?._addStateInfo?.(
            def._ngState || null,
            def._ngStateParams,
          );
        }

        if (!isNullOrUndefined(def._href)) {
          attrs.$set(type._attr, def._href);
        }
      }

      for (let i = 0; i < inputAttrs.length; i++) {
        const field = inputAttrs[i];

        rawDef[rawDefKeyByAttr[field]] = attrs[field]
          ? $parse(attrs[field])(scope)
          : null;
        attrs.$observe(field, (expr) => {
          watchDeregFns[field]();

          if (!expr) return;
          watchDeregFns[field] =
            scope.$watch(expr as string, (newval) => {
              rawDef[rawDefKeyByAttr[field]] = newval;
              update();
            }) || noopDeregister;
        });
      }
      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));

      if (!type._clickable) return;
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
export function StateRefActiveDirective(
  $state: ng.StateService,
  $routerState: ng._RouterProvider,
  $interpolate: ng.InterpolateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
  $parse: ng.ParseService,
): ng.Directive {
  return {
    restrict: "A",
    controller(
      this: StateRefActiveController,
      $scope: ng.Scope,
      $element: HTMLElement,
      $attrs: ng.Attributes,
    ): void {
      let states: ActiveClassState[] = [];

      let ngSrefActive: unknown;

      // There probably isn't much point in $observing this
      // ngSrefActive and ngSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      const activeEqClass =
        (
          $interpolate(
            $attrs.ngSrefActiveEq || "",
            false,
          ) as ng.InterpolationFunction
        )($scope) || "";

      try {
        ngSrefActive = $attrs.ngSrefActive
          ? $parse($attrs.ngSrefActive)($scope)
          : undefined;
      } catch {
        // Do nothing. ngSrefActive is not a valid expression.
        // Fall back to using $interpolate below
      }
      ngSrefActive =
        ngSrefActive ||
        (
          $interpolate(
            $attrs.ngSrefActive || "",
            false,
          ) as ng.InterpolationFunction
        )($scope) ||
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
      function updateAfterTransition(trans: ng.Transition): void {
        trans.promise.then(update, () => {
          /* empty */
        });
      }
      $scope.$on("$destroy", setupEventListeners());

      if ($routerState._transition) {
        updateAfterTransition($routerState._transition);
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
        setStatesFromDefinitionObject(ngSrefActive);
      }
      /** Updates the tracked state list from the directive definition object. */
      function setStatesFromDefinitionObject(statesDefinition: unknown): void {
        if (isObject(statesDefinition)) {
          states = [];
          const stateEntries = entries(
            statesDefinition as Record<string, unknown>,
          );

          for (let i = 0; i < stateEntries.length; i++) {
            const [activeClass, stateOrName] = stateEntries[i];

            if (isString(stateOrName)) {
              addStateForClass(stateOrName, activeClass);
            } else if (isArray(stateOrName)) {
              for (let j = 0; j < stateOrName.length; j++) {
                addStateForClass(stateOrName[j] as string, activeClass);
              }
            }
          }
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

        const foundState = !isArray(state) ? state : undefined;

        const stateInfo = {
          _state: {
            name:
              foundState?.name ||
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

        let exactlyMatchesAny = false;

        for (let i = 0; i < states.length; i++) {
          const state = states[i];

          if ($state.includes(state._state.name, state._params as RawParams)) {
            fuzzyStates.push(state);
          }

          if ($state.is(state._state.name, state._params as RawParams)) {
            exactlyMatchesAny = true;
          }
        }

        const fuzzyClasses = getClasses(fuzzyStates);

        const exactClasses: string[] = [];

        if (exactlyMatchesAny) {
          appendSplitClasses(exactClasses, activeEqClass);
        }

        const addClasses = uniqueStrings(fuzzyClasses.concat(exactClasses));

        const removeClasses: string[] = [];

        const uniqueClasses = uniqueStrings(allClasses);

        for (let i = 0; i < uniqueClasses.length; i++) {
          const cls = uniqueClasses[i];

          if (!addClasses.includes(cls)) {
            removeClasses.push(cls);
          }
        }

        for (let i = 0; i < addClasses.length; i++) {
          const className = addClasses[i];

          $element.classList.add(className);
        }

        for (let i = 0; i < removeClasses.length; i++) {
          const className = removeClasses[i];

          $element.classList.remove(className);
        }
      }
      update();
    },
  };
}
