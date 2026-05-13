import { isFunction, uppercase } from "../../shared/utils.ts";
import { getCacheData, getInheritedData } from "../../shared/dom.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { TargetState } from "../state/target-state.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewConfig } from "../view/view.ts";

export type ViewControllerInstance = Record<string, unknown> & {
  $onInit?: () => void;
  ngOnParamsChanged?: (
    params: Record<string, unknown>,
    trans: ng.Transition,
  ) => void;
  ngCanExit?: (trans: ng.Transition) => unknown;
};

type NgCanExitTransition = ng.Transition & {
  _ngCanExitIds?: Record<number, boolean>;
};

interface ParamSchemaEntry {
  id: string | number;
  type: { equals: (a: unknown, b: unknown) => boolean };
}

const controllerRegisteredScopes = new WeakMap<
  ViewControllerInstance,
  WeakSet<object>
>();

const controllerLastParamsChangedTransition = new WeakMap<
  ViewControllerInstance,
  ng.Transition
>();

function appendParamSchema(
  nodes: PathNode[],
  schema: ParamSchemaEntry[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const nodeSchema = nodes[i].paramSchema;

    for (let j = 0; j < nodeSchema.length; j++) {
      schema.push(nodeSchema[j]);
    }
  }
}

function controllerKeyData(
  element: Element,
  key: string,
): ViewControllerInstance | undefined {
  return (
    (getCacheData(element, key) as ViewControllerInstance | undefined) ||
    (getInheritedData(element, key) as ViewControllerInstance | undefined)
  );
}

/** @internal */
export function getComponentController(
  element: HTMLElement,
  componentName: string,
  tagRegexp: RegExp,
): ViewControllerInstance | undefined {
  const candidates = element.querySelectorAll("*");

  let directiveEl: Element | undefined;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    if (candidate.tagName && tagRegexp.exec(candidate.tagName)) {
      directiveEl = candidate;
      break;
    }
  }

  if (!directiveEl) return undefined;

  const camelNameFromTag = directiveEl.tagName
    .toLowerCase()
    .replace(/-([a-z])/g, (_all, letter: string) => uppercase(letter));

  const scopeWithCtrl =
    (getCacheData(directiveEl, "$isolateScope") as
      | Record<string, ViewControllerInstance>
      | undefined) ||
    (getInheritedData(directiveEl, "$isolateScope") as
      | Record<string, ViewControllerInstance>
      | undefined) ||
    (getCacheData(directiveEl, "$scope") as
      | Record<string, ViewControllerInstance>
      | undefined) ||
    (getInheritedData(directiveEl, "$scope") as
      | Record<string, ViewControllerInstance>
      | undefined);

  return (
    controllerKeyData(directiveEl, `$${componentName}Controller`) ||
    controllerKeyData(directiveEl, `$${camelNameFromTag}Controller`) ||
    controllerKeyData(directiveEl, "$ngControllerController") ||
    scopeWithCtrl?.$ctrl
  );
}

/** @ignore incrementing id */
let _ngCanExitId = 0;

/**
 * Registers component/controller transition lifecycle callbacks for an active view.
 *
 * @internal
 */
export function registerViewControllerCallbacks(
  $transitions: ng.TransitionService,
  controllerInstance: ViewControllerInstance,
  $scope: ng.Scope,
  cfg: Pick<ViewConfig, "_viewDecl" | "_path"> &
    Partial<Pick<ViewConfig, "_factory">>,
): void {
  let registeredScopes = controllerRegisteredScopes.get(controllerInstance);

  if (!registeredScopes) {
    registeredScopes = new WeakSet<object>();
    controllerRegisteredScopes.set(controllerInstance, registeredScopes);
  }

  if (registeredScopes.has($scope as object)) {
    return;
  }

  registeredScopes.add($scope as object);

  // Call $onInit() ASAP
  const onInit = controllerInstance.$onInit;

  if (isFunction(onInit) && !cfg._viewDecl.component) {
    onInit();
  }
  const viewState = cfg._path[cfg._path.length - 1].state.self;

  const hookOptions = { bind: controllerInstance };

  // Add component-level hook for ngOnParamsChanged
  if (isFunction(controllerInstance.ngOnParamsChanged)) {
    const onParamsChanged = controllerInstance.ngOnParamsChanged as (
      params: Record<string, unknown>,
      trans: ng.Transition,
    ) => void;

    const resolveContext = new ResolveContext(
      cfg._path,
      cfg._factory?._injector,
    );

    const viewCreationTrans = resolveContext.getResolvable("$transition$")
      .data as ng.Transition;

    // Fire callback on any successful transition
    const paramsUpdated = ($transition$: ng.Transition | undefined) => {
      if (!$transition$) return;

      if (
        controllerLastParamsChangedTransition.get(controllerInstance) ===
        $transition$
      ) {
        return;
      }

      controllerLastParamsChangedTransition.set(
        controllerInstance,
        $transition$,
      );

      // Exit early if the $transition$ is the same as the view was created within.
      // Exit early if the $transition$ will exit the state the view is for.
      if (
        $transition$ === viewCreationTrans ||
        $transition$.exiting().includes(viewState)
      ) {
        return;
      }

      const toParams = $transition$.params("to");

      const fromParams = $transition$.params("from");

      const toNodes = $transition$._treeChanges.to || [];

      const fromNodes = $transition$._treeChanges.from || [];

      const toSchema: ParamSchemaEntry[] = [];

      appendParamSchema(toNodes, toSchema);

      const fromSchema: ParamSchemaEntry[] = [];

      appendParamSchema(fromNodes, fromSchema);

      // Find the to params that have different values than the from params
      const changedToParams: ParamSchemaEntry[] = [];

      for (let i = 0; i < toSchema.length; i++) {
        const param = toSchema[i];

        const idx = fromSchema.indexOf(param);

        if (
          idx === -1 ||
          !fromSchema[idx].type.equals(toParams[param.id], fromParams[param.id])
        ) {
          changedToParams.push(param);
        }
      }

      // Only trigger callback if a to param has changed or is new
      if (changedToParams.length) {
        // Filter the params to only changed/new to params. `$transition$.params()` may be used to get all params.
        const newValues: Record<string | number, unknown> = {};

        for (let i = 0; i < changedToParams.length; i++) {
          const param = changedToParams[i];

          const key = param.id;

          if (key in toParams) newValues[key] = toParams[key];
        }
        onParamsChanged.call(controllerInstance, newValues, $transition$);
      }
    };

    const hookRegistryKey = [
      viewState?.name || "",
      cfg._viewDecl._ngViewName || "$default",
      cfg._viewDecl._ngViewContextAnchor || "^",
    ].join("::");

    const rootScope = $scope.$root as ng.Scope &
      Record<string, Map<string, () => void> | undefined>;

    const registryProp = "__ngRouterParamsChangedHooks__";

    const hookRegistry =
      rootScope[registryProp] ||
      (rootScope[registryProp] = new Map<string, () => void>());

    hookRegistry.get(hookRegistryKey)?.();

    const deregisterParamsHook = $transitions.onSuccess(
      {},
      paramsUpdated,
      hookOptions,
    );

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
    const ngCanExit = controllerInstance.ngCanExit as (
      trans: ng.Transition,
    ) => boolean | void | TargetState;

    const id = _ngCanExitId++;

    /**
     * Returns true if any transition in the redirect chain already answered truthy.
     */
    const prevTruthyAnswer = (trans: ng.Transition | null): boolean => {
      if (!trans) return false;

      const cache = (trans as NgCanExitTransition)._ngCanExitIds;

      return (
        cache?.[id] === true ||
        prevTruthyAnswer(trans._options.redirectedFrom || null)
      );
    };

    // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
    const wrappedHook = (trans: ng.Transition) => {
      let promise: Promise<boolean | void | TargetState> | undefined;

      const cacheTrans = trans as NgCanExitTransition;

      const ids = (cacheTrans._ngCanExitIds = cacheTrans._ngCanExitIds || {});

      if (!prevTruthyAnswer(trans)) {
        promise = Promise.resolve(ngCanExit.call(controllerInstance, trans));
        void promise.then((val) => (ids[id] = val !== false));
      }

      return promise;
    };

    const criteria = { exiting: viewState.name };

    $scope.$on(
      "$destroy",
      $transitions.onBefore(criteria, wrappedHook, hookOptions),
    );
  }
}
