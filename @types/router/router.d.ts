import { Queue } from "../shared/queue.ts";
import { StateParams } from "./params/state-params.ts";
import type { StateDeclaration } from "./state/interface.ts";
import type { StateObject } from "./state/state-object.ts";
import type { Transition } from "./transition/transition.ts";
export declare class RouterProvider {
  params: StateParams;
  _lastStartedTransitionId: number;
  _transitionHistory: Queue<Transition>;
  _successfulTransitions: Queue<Transition>;
  current: StateDeclaration | undefined;
  $current: StateObject | undefined;
  transition: Transition | undefined;
  constructor();
  $get: () => RouterProvider;
}
