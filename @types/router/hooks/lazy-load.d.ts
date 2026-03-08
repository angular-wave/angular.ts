import type { LazyLoadResult, StateDeclaration } from "../state/interface.ts";
import type { TransitionService } from "../transition/interface.ts";
import type { Transition } from "../transition/transition.ts";
/**
 * Registers the built-in hook that runs state `lazyLoad` callbacks before entry.
 */
export declare function registerLazyLoadHook(
  transitionService: TransitionService,
  stateService?: ng.StateService,
  urlService?: ng.UrlService,
  stateRegistry?: ng.StateRegistryService,
): import("../transition/interface.ts").DeregisterFn;
/**
 * Invokes one state's `lazyLoad` function and memoizes concurrent calls.
 */
export declare function lazyLoadState(
  transition: Transition,
  state: StateDeclaration,
  stateRegistry?: ng.StateRegistryService,
): Promise<LazyLoadResult | undefined>;
