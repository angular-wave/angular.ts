import { isArray } from "../../shared/utils.js";
import type { StateDeclaration } from "../state/interface.ts";
import type { TransitionService } from "../transition/transition-service.ts";
import type { Transition } from "../transition/transition.js";

/**
 * The return type of a [[StateDeclaration.lazyLoad]] function.
 *
 * If the promise resolves to an object with `states`, those states are
 * automatically registered before the original transition is retried.
 */
export interface LazyLoadResult {
  states?: StateDeclaration[];
}

/**
 * Signature for a state-level lazy loader function.
 */
export type LazyLoadFn = (
  transition: Transition,
  state: StateDeclaration,
) => Promise<LazyLoadResult>;

/**
 * Registers the built-in hook that runs state `lazyLoad` callbacks before entry.
 */
export function registerLazyLoadHook(
  transitionService: TransitionService,
  stateService?: ng.StateService,
  urlService?: ng.UrlService,
  stateRegistry?: ng.StateRegistryService,
) {
  return transitionService.onBefore(
    {
      entering: (state) => !!(state as ng.BuiltStateDeclaration).lazyLoad,
    },
    (transition: Transition) => {
      function retryTransition() {
        if (transition.originalTransition().options().source !== "url") {
          const orig = transition.targetState();

          return stateService!.target(
            orig.identifier(),
            orig.params(),
            orig.options(),
          );
        }

        const result = urlService?.match(urlService.parts());
        const rule = result && result.rule;

        if (rule && rule.type === "STATE" && rule.state) {
          const { state } = rule;
          const params = result.match;

          return stateService?.target(state, params, transition.options());
        }

        urlService?.sync();

        return undefined;
      }

      const promises = transition
        .entering()
        .filter((state) => state._state && !!state._state().lazyLoad)
        .map((state) => lazyLoadState(transition, state, stateRegistry));

      return Promise.all(promises).then(retryTransition);
    },
  );
}

const lazyLoadPromiseCache = new WeakMap<LazyLoadFn, Promise<any>>();

/**
 * Invokes one state's `lazyLoad` function and memoizes concurrent calls.
 */
export function lazyLoadState(
  transition: Transition,
  state: StateDeclaration,
  stateRegistry?: ng.StateRegistryService,
): Promise<LazyLoadResult | undefined> {
  const lazyLoadFn = (state._state && state._state().lazyLoad) as LazyLoadFn;
  let promise = lazyLoadPromiseCache.get(lazyLoadFn);

  if (!promise) {
    const success = (result: LazyLoadResult | undefined) => {
      delete state.lazyLoad;
      if (state._state) delete state._state().lazyLoad;
      lazyLoadPromiseCache.delete(lazyLoadFn);

      return result;
    };

    const error = (err: any) => {
      lazyLoadPromiseCache.delete(lazyLoadFn);

      return Promise.reject(err);
    };

    promise = Promise.resolve(lazyLoadFn(transition, state))
      .then(updateStateRegistry)
      .then(success, error);

    lazyLoadPromiseCache.set(lazyLoadFn, promise);
  }

  function updateStateRegistry(result: LazyLoadResult | undefined) {
    if (result && isArray(result.states)) {
      result.states.forEach(
        (_state) => stateRegistry && stateRegistry.register(_state),
      );
    }

    return result;
  }

  return promise;
}
