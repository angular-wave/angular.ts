import type { RegisteredHook } from "./hook-registry.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import type { IMatchingNodes, TreeChanges } from "./interface.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";
export declare class HookBuilder {
  transition: Transition;
  constructor(transition: Transition);
  buildHooksForPhase(phase: TransitionHookPhase): TransitionHook[];
  buildHooks(hookType: TransitionEventType): TransitionHook[];
  getMatchingHooks(
    hookType: TransitionEventType,
    treeChanges: TreeChanges,
    transition: Transition,
  ): Array<{
    hook: RegisteredHook;
    matches: IMatchingNodes;
  }>;
}
