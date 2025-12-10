import { removeFrom, tail, uniqR, unnestR } from "../../shared/common.js";
import {
  entries,
  isArray,
  isNullOrUndefined,
  isObject,
  isString,
} from "../../shared/utils.js";
import { parse } from "../../shared/hof.js";
import { getInheritedData } from "../../shared/dom.js";

function parseStateRef(ref) {
  const paramsOnly = ref.match(/^\s*({[^}]*})\s*$/);

  if (paramsOnly) ref = `(${paramsOnly[1]})`;
  const parsed = ref
    .replace(/\n/g, " ")
    .match(/^\s*([^(]*?)\s*(\((.*)\))?\s*$/);

  if (!parsed || parsed.length !== 4)
    throw new Error(`Invalid state ref '${ref}'`);

  return { state: parsed[1] || null, paramExpr: parsed[3] || null };
}

function stateContext(el) {
  const $ngView = getInheritedData(el, "$ngView");

  const path = parse("$cfg.path")($ngView);

  return path ? tail(path).state.name : undefined;
}

function processedDef($state, $element, def) {
  const ngState = def.ngState || $state.current.name;

  const ngStateOpts = Object.assign(
    defaultOpts($element, $state),
    def.ngStateOpts || {},
  );

  const href = $state.href(ngState, def.ngStateParams, ngStateOpts);

  return { ngState, ngStateParams: def.ngStateParams, ngStateOpts, href };
}

function getTypeInfo(el) {
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

function clickHook(el, $state, type, getDef, scope) {
  return function (event) {
    const button = event.which || event.button,
      target = getDef();

    const res =
      button > 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      el.getAttribute("target");

    if (!res) {
      // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
      const transition = setTimeout(function () {
        if (!el.getAttribute("disabled")) {
          $state
            .go(target.ngState, target.ngStateParams, target.ngStateOpts)
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

function defaultOpts(el, $state) {
  return {
    relative: stateContext(el) || $state.$current,
    inherit: true,
    source: "sref",
  };
}

function bindEvents(element, scope, hookFn, ngStateOpts) {
  let events = ngStateOpts ? ngStateOpts.events : undefined;

  if (!isArray(events)) {
    events = ["click"];
  }
  //const on = element.on ? "on" : "bind";

  for (const event of events) {
    element.addEventListener(event, hookFn);
  }
  scope.$on("$destroy", function () {
    // const off = element.off ? "off" : "unbind";
    for (const event of events) {
      element.removeEventListener(event, hookFn);
    }
  });
}

// // TODO: SEPARATE THESE OUT

$StateRefDirective.$inject = ["$state", "$stateRegistry", "$transitions"];
export function $StateRefDirective(
  $stateService,
  $stateRegistry,
  $transitions,
) {
  const $state = $stateService;

  return {
    restrict: "A",
    require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
    link: (scope, element, attrs, ngSrefActive) => {
      const type = getTypeInfo(element);

      const active = ngSrefActive[1] || ngSrefActive[0];

      let unlinkInfoFn = null;

      const rawDef = {};

      const getDef = () => processedDef($state, element, rawDef);

      const ref = parseStateRef(attrs.ngSref);

      rawDef.ngState = ref.state;
      rawDef.ngStateOpts = attrs.ngSrefOpts
        ? scope.$eval(attrs.ngSrefOpts)
        : {};

      function update() {
        rawDef.ngStateParams = Object.assign({}, scope.$eval(ref.paramExpr));
        const def = getDef();

        if (unlinkInfoFn) {
          unlinkInfoFn();
        }

        if (active) {
          unlinkInfoFn = active.$$addStateInfo(def.ngState, def.ngStateParams);
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

$StateRefDynamicDirective.$inject = [
  "$state",
  "$stateRegistry",
  "$transitions",
];

/**
 * @param $state
 * @param $stateRegistry
 * @param $transitions
 * @returns {import("../../interface.ts").Directive}
 */
export function $StateRefDynamicDirective(
  $state,
  $stateRegistry,
  $transitions,
) {
  return {
    restrict: "A",
    require: ["?^ngSrefActive", "?^ngSrefActiveEq"],
    link(scope, element, attrs, ngSrefActive) {
      const type = getTypeInfo(element);

      const active = ngSrefActive[1] || ngSrefActive[0];

      let unlinkInfoFn = null;

      const rawDef = {};

      const getDef = () => processedDef($state, element, rawDef);

      const inputAttrs = ["ngState", "ngStateParams", "ngStateOpts"];

      const watchDeregFns = inputAttrs.reduce(
        (acc, attr) => (
          (acc[attr] = () => {
            /* empty */
          }),
          acc
        ),
        {},
      );

      function update() {
        const def = getDef();

        if (unlinkInfoFn) {
          unlinkInfoFn();
        }

        if (active) {
          unlinkInfoFn = active.$$addStateInfo(def.ngState, def.ngStateParams);
        }

        if (!isNullOrUndefined(def.href)) {
          attrs.$set(type.attr, def.href);
        }
      }
      inputAttrs.forEach((field) => {
        rawDef[field] = attrs[field] ? scope.$eval(attrs[field]) : null;
        attrs.$observe(field, (expr) => {
          watchDeregFns[field]();
          watchDeregFns[field] = scope.$watch(expr, (newval) => {
            rawDef[field] = newval;
            update();
          });
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

$StateRefActiveDirective.$inject = [
  "$state",
  "$router",
  "$interpolate",
  "$stateRegistry",
  "$transitions",
];

/**
 * @param {*} $state
 * @param {import('../router.js').RouterProvider} $router
 * @param {*} $interpolate
 * @param {*} $stateRegistry
 * @param {*} $transitions
 * @returns {import("../../interface.ts").Directive}
 */
export function $StateRefActiveDirective(
  $state,
  $router,
  $interpolate,
  $stateRegistry,
  $transitions,
) {
  return {
    restrict: "A",
    controller($scope, $element, $attrs) {
      let states = [];

      let ngSrefActive;

      // There probably isn't much point in $observing this
      // ngSrefActive and ngSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      const activeEqClass = $interpolate(
        $attrs.ngSrefActiveEq || "",
        false,
      )($scope);

      try {
        ngSrefActive = $scope.$eval($attrs.ngSrefActive);
      } catch {
        // Do nothing. ngSrefActive is not a valid expression.
        // Fall back to using $interpolate below
      }
      ngSrefActive =
        ngSrefActive || $interpolate($attrs.ngSrefActive || "", false)($scope);
      setStatesFromDefinitionObject(ngSrefActive);
      // Allow ngSref to communicate with ngSrefActive[Equals]
      this.$$addStateInfo = function (newState, newParams) {
        // we already got an explicit state provided by ng-sref-active, so we
        // shadow the one that comes from ng-sref
        if (isObject(ngSrefActive) && states.length > 0) {
          return undefined;
        }
        const deregister = addState(newState, newParams, ngSrefActive);

        update();

        return deregister;
      };
      function updateAfterTransition(trans) {
        trans.promise.then(update, () => {
          /* empty */
        });
      }
      $scope.$on("$destroy", setupEventListeners());

      if ($router._transition) {
        updateAfterTransition($router._transition);
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
      function setStatesFromDefinitionObject(statesDefinition) {
        if (isObject(statesDefinition)) {
          states = [];
          entries(statesDefinition).forEach(([activeClass, stateOrName]) => {
            // Helper function to abstract adding state.
            const addStateForClass = function (
              stateOrNameParam,
              activeClassParam,
            ) {
              const ref = parseStateRef(stateOrNameParam);

              addState(
                ref.state,
                $scope.$eval(ref.paramExpr),
                activeClassParam,
              );
            };

            if (isString(stateOrName)) {
              // If state is string, just add it.
              addStateForClass(stateOrName, activeClass);
            } else if (isArray(stateOrName)) {
              // If state is an array, iterate over it and add each array item individually.
              stateOrName.forEach((stateOrNameParam) => {
                addStateForClass(stateOrNameParam, activeClass);
              });
            }
          });
        }
      }
      function addState(stateName, stateParams, activeClass) {
        const state = $state.get(stateName, stateContext($element));

        const stateInfo = {
          state: state || { name: stateName },
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
        const splitClasses = (str) => str.split(/\s/).filter(Boolean);

        const getClasses = (stateList) =>
          stateList
            .map((x) => x.activeClass)
            .map(splitClasses)
            .reduce(unnestR, []);

        const allClasses = getClasses(states)
          .concat(splitClasses(activeEqClass))
          .reduce(uniqR, []);

        const fuzzyClasses = getClasses(
          states.filter((x) => $state.includes(x.state.name, x.params)),
        );

        const exactlyMatchesAny = !!states.filter((x) =>
          $state.is(x.state.name, x.params),
        ).length;

        const exactClasses = exactlyMatchesAny
          ? splitClasses(activeEqClass)
          : [];

        const addClasses = fuzzyClasses.concat(exactClasses).reduce(uniqR, []);

        const removeClasses = allClasses.filter(
          (cls) => !addClasses.includes(cls),
        );

        addClasses.forEach((className) => $element.classList.add(className));
        removeClasses.forEach((className) =>
          $element.classList.remove(className),
        );
      }
      update();
    },
  };
}
