import { removeFrom, tail, uniqR, unnestR } from "../../shared/common.ts";
import {
  assign,
  entries,
  isArray,
  isNullOrUndefined,
  isObject,
  isString,
} from "../../shared/utils.ts";
import { parse } from "../../shared/hof.ts";
import { getInheritedData } from "../../shared/dom.ts";
import { $injectTokens } from "../../injection-tokens.ts";
type ParsedStateRef = { _state: string | null; _paramExpr: string | null };

type ProcessedDef = {
  _ngState: unknown;
  _ngStateParams: any;
  _ngStateOpts: any;
  _href: string | null | undefined;
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
    newState: unknown,
    newParams: unknown,
  ) => (() => void) | undefined;
};

type WatchDeregFns = Record<string, () => void>;

const noopDeregister = () => undefined;

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

  const path = parse("$cfg.path")($ngView) as
    | Array<{ state: { name: string } }>
    | undefined;

  return path
    ? (tail(path) as { state: { name: string } }).state.name
    : undefined;
}

/**
 * Computes the current state-ref definition, href, and navigation options.
 */
function processedDef(
  $state: ng.StateService,
  $element: HTMLElement,
  def: Record<string, any>,
): ProcessedDef {
  const ngState = def._ngState || $state.current?.name;

  const ngStateOpts = assign(
    defaultOpts($element, $state),
    def._ngStateOpts || {},
  );

  const href = $state.href(ngState, def._ngStateParams, ngStateOpts);

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
  getDef: () => ProcessedDef,
  scope: ng.Scope,
): EventListener {
  return function (event: Event): void {
    const mouseEvent = event as MouseEvent;

    const { button } = mouseEvent;

    const target = getDef();

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

        if (!el.getAttribute("disabled")) {
          $state
            .go(
              target._ngState as any,
              target._ngStateParams,
              target._ngStateOpts,
            )
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
function defaultOpts(el: Node, $state: { $current: unknown }): any {
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
  ngStateOpts: { events?: unknown } | null | undefined,
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
  $injectTokens._state,
  $injectTokens._rootScope,
  $injectTokens._stateRegistry,
  $injectTokens._transitions,
];

/**
 * Generates `ng-sref` links and keeps their href/state data in sync.
 */
export function StateRefDirective(
  $stateService: ng.StateService,
  $rootScope: ng.Scope,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
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

      const rawDef: Record<string, any> = {};

      const getDef = () => processedDef($state, element, rawDef);

      const ref = parseStateRef(attrs.ngSref);

      rawDef._ngState = ref._state;
      rawDef._ngStateOpts = attrs.ngSrefOpts
        ? scope.$eval(attrs.ngSrefOpts)
        : {};

      function update() {
        rawDef._ngStateParams = assign(
          {},
          ref._paramExpr && scope.$eval(ref._paramExpr),
        );
        const def = getDef();

        if (unlinkInfoFn) {
          unlinkInfoFn();
        }

        if (active) {
          unlinkInfoFn = active?._addStateInfo?.(
            def._ngState,
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
        rawDef._ngStateParams = assign({}, scope.$eval(ref._paramExpr));
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
        clickHook(element, $state, type, getDef, $rootScope),
        rawDef._ngStateOpts,
      );
    },
  };
}

StateRefDynamicDirective.$inject = [
  $injectTokens._state,
  $injectTokens._rootScope,
  $injectTokens._stateRegistry,
  $injectTokens._transitions,
];

/**
 * Generates dynamic `ui-state` links whose target state is read from an expression.
 */
export function StateRefDynamicDirective(
  $state: ng.StateService,
  $rootScope: ng.Scope,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
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

      const rawDef: Record<string, any> = {};

      const getDef = () => processedDef($state, element, rawDef);

      const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"] as const;

      const rawDefKeyByAttr = {
        ngState: "_ngState",
        ngStateParams: "_ngStateParams",
        ngStateOpts: "_ngStateOpts",
      } as const;

      const watchDeregFns = inputAttrs.reduce(
        (acc, attr) => (
          (acc[attr] = () => {
            /* empty */
          }),
          acc
        ),
        {} as WatchDeregFns,
      );

      function update() {
        const def = getDef();

        if (unlinkInfoFn) {
          unlinkInfoFn();
        }

        if (active) {
          unlinkInfoFn = active?._addStateInfo?.(
            def._ngState,
            def._ngStateParams,
          );
        }

        if (!isNullOrUndefined(def._href)) {
          attrs.$set(type._attr, def._href);
        }
      }
      inputAttrs.forEach((field) => {
        rawDef[rawDefKeyByAttr[field]] = attrs[field]
          ? scope.$eval(attrs[field])
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
      });
      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));

      if (!type._clickable) return;
      const hookFn = clickHook(element, $state, type, getDef, $rootScope);

      bindEvents(element, scope, hookFn, rawDef._ngStateOpts);
    },
  };
}

StateRefActiveDirective.$inject = [
  $injectTokens._state,
  $injectTokens._router,
  $injectTokens._interpolate,
  $injectTokens._stateRegistry,
  $injectTokens._transitions,
];

/**
 * Toggles active CSS classes based on the current router state.
 */
export function StateRefActiveDirective(
  $state: ng.StateService,
  $routerState: any,
  $interpolate: ng.InterpolateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
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
        ngSrefActive = $scope.$eval($attrs.ngSrefActive);
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
      function setStatesFromDefinitionObject(statesDefinition: any): void {
        if (isObject(statesDefinition)) {
          states = [];
          entries(statesDefinition as Record<string, unknown>).forEach(
            ([activeClass, stateOrName]) => {
              // Helper function to abstract adding state.
              const addStateForClass = function (
                stateOrNameParam: string,
                activeClassParam: string,
              ): void {
                const ref = parseStateRef(stateOrNameParam);

                addState(
                  ref._state,
                  ref._paramExpr && $scope.$eval(ref._paramExpr),
                  activeClassParam,
                );
              };

              if (isString(stateOrName)) {
                // If state is string, just add it.
                addStateForClass(stateOrName, activeClass);
              } else if (isArray(stateOrName)) {
                // If state is an array, iterate over it and add each array item individually.
                (stateOrName as string[]).forEach(
                  (stateOrNameParam: string) => {
                    addStateForClass(stateOrNameParam, activeClass);
                  },
                );
              }
            },
          );
        }
      }
      function addState(
        stateName: any,
        stateParams: unknown,
        activeClass: string,
      ): () => void {
        const state = $state.get(stateName, stateContext($element));

        const stateInfo = {
          _state: {
            name: (state as any)?.name || String(stateName?.name || stateName),
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
        const splitClasses = (str: string) => str.split(/\s/).filter(Boolean);

        const getClasses = (stateList: ActiveClassState[]) =>
          stateList
            .map((x) => x._activeClass)
            .map(splitClasses)
            .reduce(unnestR, []);

        const allClasses = getClasses(states)
          .concat(splitClasses(activeEqClass))
          .reduce(uniqR, []) as string[];

        const fuzzyClasses = getClasses(
          states.filter((x) =>
            $state.includes(x._state.name, x._params as any),
          ),
        ) as string[];

        const exactlyMatchesAny = !!states.filter((x) =>
          $state.is(x._state.name, x._params as any),
        ).length;

        const exactClasses = exactlyMatchesAny
          ? splitClasses(activeEqClass)
          : [];

        const addClasses = fuzzyClasses
          .concat(exactClasses)
          .reduce(uniqR, []) as string[];

        const removeClasses = allClasses.filter(
          (cls) => !addClasses.includes(cls),
        );

        addClasses.forEach((className: string) =>
          $element.classList.add(className),
        );
        removeClasses.forEach((className: string) =>
          $element.classList.remove(className),
        );
      }
      update();
    },
  };
}
