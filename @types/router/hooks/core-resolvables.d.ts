import { Transition } from "../transition/transition.ts";
import type { TransitionService } from "../transition/interface.ts";
export declare function registerAddCoreResolvables(
  transitionService: TransitionService,
): import("../transition/interface.ts").DeregisterFn;
export declare function treeChangesCleanup(trans: Transition): void;
