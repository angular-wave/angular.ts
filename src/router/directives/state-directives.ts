import { removeFrom, tail, uniqR, unnestR } from "../../shared/common.ts";
import {
  entries,
  isArray,
  isNullOrUndefined,
  isObject,
  isString,
} from "../../shared/utils.ts";
import { parse } from "../../shared/hof.ts";
import { getInheritedData } from "../../shared/dom.ts";
import { $injectTokens } from "../../injection-tokens.ts";
type ParsedStateRef = { state: string | null; paramExpr: string | null };
type ProcessedDef = {
  ngState: unknown;
  ngStateParams: any;
  ngStateOpts: any;
  href: string | null | undefined;
};
type TypeInfo = {
  attr: string;
  isAnchor: boolean;
  clickable: boolean;
};
type ActiveClassState = {
  state: { name: string };
  params: unknown;
  activeClass: string;
};
type StateRefActiveController = {
  _addStateInfo?: (
    newState: unknown,
    newParams: unknown,
  ) => (() => void) | undefined;
};
type WatchDeregFns = Record<string, () => void>;

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

  return { state: parsed[1] || null, paramExpr: parsed[3] || null };
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
  const ngState = def.ngState || $state.current?.name;

  const ngStateOpts = Object.assign(
    defaultOpts($element, $state),
    def.ngStateOpts || {},
  );

  const href = $state.href(ngState, def.ngStateParams, ngStateOpts);

  return { ngState, ngStateParams: def.ngStateParams, ngStateOpts, href };
}

/**
 * Returns the relevant DOM attribute and click behavior metadata for the element.
 */
function getTypeInfo(el: HTMLElement): TypeInfo {
  // SVGAElement does not use the href attribute, but rather the 'xlinkHref' attribute.
  const isSvg =
    Object.prototype.toString.call(el.getAttribute("href")) ===
    "[object SVGAnimatedString]";

  const isForm = el.nodeName === "FORM";

  return {
    attr: isForm ? "action" : isSvg ? "xlink:href" : "href",
    isAnchor: el.nodeName === "A",
    clickable: !isForm,
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
    const button = mouseEvent.which || mouseEvent.button,
      target = getDef();

    const res =
      button > 1 ||
      mouseEvent.ctrlKey ||
      mouseEvent.metaKey ||
      mouseEvent.shiftKey ||
      mouseEvent.altKey ||
      el.getAttribute("target");

    if (!res) {
      // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
      const transition = setTimeout(function () {
        if (!el.getAttribute("disabled")) {
          $state
            .go(target.ngState as any, target.ngStateParams, target.ngStateOpts)
            .then(() => {
              scope.$emit("$updateBrowser");
            });
        }
      });

      event.preventDefault();
      // if the state has no URL, ignore one preventDefault from the <a> directive.
      let ignorePreventDefaultCount = type.isAnchor && !target.href ? 1 : 0;

      event.preventDefault = function () {
        if (ignorePreventDefaultCount-- <= 0) clearTimeout(transition);
      };
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
  $injectTokens._stateRegistry,
  $injectTokens._transitions,
];

/**
 * @param {ng.StateService} $stateService
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export function StateRefDirective(
  $stateService: ng.StateService,
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

      /**
       * @type {(() => void) | null}
       */
      let unlinkInfoFn: (() => void) | undefined;

      const rawDef: Record<string, any> = {};

      const getDef = () => processedDef($state, element, rawDef);

      const ref = parseStateRef(attrs.ngSref);

      rawDef.ngState = ref.state;
      rawDef.ngStateOpts = attrs.ngSrefOpts
        ? scope.$eval(attrs.ngSrefOpts)
        : {};

      function update() {
        rawDef.ngStateParams = Object.assign(
          {},
          ref.paramExpr && scope.$eval(ref.paramExpr),
        );
        const def = getDef();

        if (unlinkInfoFn) {
          unlinkInfoFn();
        }

        if (active) {
          unlinkInfoFn = active?._addStateInfo?.(
            def.ngState,
            def.ngStateParams,
          );
        }

        if (!isNullOrUndefined(def.href)) {
          attrs.$set(type.attr, def.href);
        }
      }

      if (ref.paramExpr) {
        scope.$watch(
          ref.paramExpr,
          function (val) {
            rawDef.ngStateParams = Object.assign({}, val);
            update();
          },
          true,
        );
        rawDef.ngStateParams = Object.assign({}, scope.$eval(ref.paramExpr));
      }

      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));

      if (!type.clickable) {
        return;
      }
      bindEvents(
        element,
        scope,
        clickHook(element, $state, type, getDef, scope),
        rawDef.ngStateOpts,
      );
    },
  };
}

StateRefDynamicDirective.$inject = [
  $injectTokens._state,
  $injectTokens._stateRegistry,
  $injectTokens._transitions,
];

/**
 * @param {ng.StateService} $state
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export function StateRefDynamicDirective(
  $state: ng.StateService,
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

      /**
       * @type {(() => void) | null}
       */
      let unlinkInfoFn: (() => void) | undefined;

      const rawDef: Record<string, any> = {};

      const getDef = () => processedDef($state, element, rawDef);

      const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"] as const;

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
            def.ngState,
            def.ngStateParams,
          );
        }

        if (!isNullOrUndefined(def.href)) {
          attrs.$set(type.attr, def.href);
        }
      }
      inputAttrs.forEach((field) => {
        rawDef[field] = attrs[field] ? scope.$eval(attrs[field]) : null;
        attrs.$observe(field, (expr) => {
          watchDeregFns[field]();
          if (!expr) return;
          watchDeregFns[field] =
            scope.$watch(expr as string, (newval) => {
              rawDef[field] = newval;
              update();
            }) || (() => {});
        });
      });
      update();
      scope.$on("$destroy", $stateRegistry.onStatesChanged(update));
      scope.$on("$destroy", $transitions.onSuccess({}, update));

      if (!type.clickable) return;
      const hookFn = clickHook(element, $state, type, getDef, scope);

      bindEvents(element, scope, hookFn, rawDef.ngStateOpts);
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
 * @param {ng.StateService} $state
 * @param {ng.RouterService} $router
 * @param {ng.InterpolateService} $interpolate
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export function StateRefActiveDirective(
  $state: ng.StateService,
  $router: ng.RouterService,
  $interpolate: ng.InterpolateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive {
  return {
    restrict: "A",
    controller: function (
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
       * @param {ng.Transition} trans
       */
      function updateAfterTransition(trans: ng.Transition): void {
        trans.promise.then(update, () => {
          /* empty */
        });
      }
      $scope.$on("$destroy", setupEventListeners());

      if ($router.transition) {
        updateAfterTransition($router.transition);
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
      /**
       * @param {{ [s: string]: any; } | ArrayLike<any>} statesDefinition
       */
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
                  ref.state,
                  ref.paramExpr && $scope.$eval(ref.paramExpr),
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
          state: {
            name: (state as any)?.name || String(stateName?.name || stateName),
          },
          params: stateParams,
          activeClass,
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
            .map((x) => x.activeClass)
            .map(splitClasses)
            .reduce(unnestR, []);

        const allClasses = getClasses(states)
          .concat(splitClasses(activeEqClass))
          .reduce(uniqR, []) as string[];

        const fuzzyClasses = getClasses(
          states.filter((x) => $state.includes(x.state.name, x.params as any)),
        ) as string[];

        const exactlyMatchesAny = !!states.filter((x) =>
          $state.is(x.state.name, x.params as any),
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
