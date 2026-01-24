/**
 * This class returns applicable TransitionHooks for a specific Transition instance.
 *
 * Hooks ([[RegisteredHook]]) may be registered globally, e.g., $transitions.onEnter(...), or locally, e.g.
 * myTransition.onEnter(...).  The HookBuilder finds matching RegisteredHooks (where the match criteria is
 * determined by the type of hook)
 *
 * The HookBuilder also converts RegisteredHooks objects to TransitionHook objects, which are used to run a Transition.
 *
 * The HookBuilder constructor is given the $transitions service and a Transition instance.  Thus, a HookBuilder
 * instance may only be used for one specific Transition object. (side note: the _treeChanges accessor is private
 * in the Transition class, so we must also provide the Transition's _treeChanges)
 */
export class HookBuilder {
  /**
   * @param {import("./transition.js").Transition} transition
   */
  constructor(transition: import("./transition.js").Transition);
  transition: import("./transition.js").Transition;
  /**
   * @param {TransitionHookPhase} phase
   * @returns
   */
  buildHooksForPhase(phase: TransitionHookPhase): any;
  /**
   * Returns an array of newly built TransitionHook objects.
   *
   * - Finds all RegisteredHooks registered for the given `hookType` which matched the transition's [[TreeChanges]].
   * - Finds [[PathNode]] (or `PathNode[]`) to use as the TransitionHook context(s)
   * - For each of the [[PathNode]]s, creates a TransitionHook
   *
   * @param hookType the type of the hook registration function, e.g., 'onEnter', 'onFinish'.
   */
  buildHooks(hookType: any): any;
  /**
   * Finds all RegisteredHooks from:
   * - The Transition object instance hook registry
   * - The TransitionService ($transitions) global hook registry
   *
   * which matched:
   * - the eventType
   * - the matchCriteria (to, from, exiting, retained, entering)
   *
   * @returns an array of matched [[RegisteredHook]]s
   */
  getMatchingHooks(
    hookType: any,
    treeChanges: any,
    transition: any,
  ): import("./hook-registry.js").RegisteredHook[];
}
import { TransitionHookPhase } from "./transition-hook.js";
