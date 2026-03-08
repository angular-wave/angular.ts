import type { LazyLoadResult, StateDeclaration } from "../state/interface.ts";
import type { TransitionService } from "../transition/interface.ts";
import type { Transition } from "../transition/transition.ts";
export declare function registerLazyLoadHook(
  transitionService: TransitionService,
  stateService?: ng.StateService,
  urlService?: ng.UrlService,
  stateRegistry?: ng.StateRegistryService,
): import("../transition/interface.ts").DeregisterFn;
export declare function lazyLoadState(
  transition: Transition,
  state: StateDeclaration,
  stateRegistry?: ng.StateRegistryService,
): Promise<LazyLoadResult | undefined>;
