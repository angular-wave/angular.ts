/** @typedef {import("./transition-event-type.js").TransitionEventType} TransitionEventType */
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
   * @returns {TransitionHook[]}
   */
  buildHooksForPhase(phase: TransitionHookPhase): TransitionHook[];
  /**
   * Returns an array of newly built TransitionHook objects.
   *
   * - Finds all RegisteredHooks registered for the given `hookType` which matched the transition's [[TreeChanges]].
   * - Finds [[PathNode]] (or `PathNode[]`) to use as the TransitionHook context(s)
   * - For each of the [[PathNode]]s, creates a TransitionHook
   *
   * @param {TransitionEventType} hookType the type of the hook registration function, e.g., 'onEnter', 'onFinish'.
   * @returns {TransitionHook[]} an array of TransitionHook objects
   */
  buildHooks(hookType: TransitionEventType): TransitionHook[];
  /**
   * Finds all RegisteredHooks from:
   * - The Transition object instance hook registry
   * - The TransitionService ($transitions) global hook registry
   *
   * which matched:
   * - the eventType
   * - the matchCriteria (to, from, exiting, retained, entering)
   * @returns an array of matched [[RegisteredHook]]s
   * @param {import("./transition-event-type.js").TransitionEventType} hookType
   * @param {import("./interface.ts").TreeChanges} treeChanges
   * @param {import("./transition.js").Transition} transition
   */
  getMatchingHooks(
    hookType: import("./transition-event-type.js").TransitionEventType,
    treeChanges: import("./interface.ts").TreeChanges,
    transition: import("./transition.js").Transition,
  ): any;
}
export type TransitionEventType =
  import("./transition-event-type.js").TransitionEventType;
import { TransitionHookPhase } from "./transition-hook.js";
import { TransitionHook } from "./transition-hook.js";
