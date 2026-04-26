import { assertPredicate, unnestR } from "../../shared/common.ts";
import { isArray } from "../../shared/utils.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { IMatchingNodes, RegisteredHook } from "./hook-registry.ts";
import {
  TransitionHook,
  TransitionHookPhase,
  TransitionHookScope,
} from "./transition-hook.ts";
import type { Transition, TreeChanges } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

/** @internal */
export interface HookTuple {
  hook: RegisteredHook;
  node: PathNode;
  transitionHook: TransitionHook;
}

/**
 * Builds runnable `TransitionHook` instances for a transition phase.
 */
/** @internal */
export class HookBuilder {
  transition: Transition;

  constructor(transition: Transition) {
    this.transition = transition;
  }

  buildHooksForPhase(phase: TransitionHookPhase): TransitionHook[] {
    return this.transition._transitionService
      ._getEvents(phase)
      .map((type: TransitionEventType) => this.buildHooks(type))
      .reduce(unnestR, [])
      .filter(Boolean);
  }

  buildHooks(hookType: TransitionEventType): TransitionHook[] {
    const { transition } = this;

    const treeChanges = transition.treeChanges() as TreeChanges;

    const matchingHooks = this.getMatchingHooks(
      hookType,
      treeChanges,
      transition,
    );

    if (!matchingHooks.length) return [];

    const baseHookOptions = {
      transition,
      current: () => transition.options().current?.() || undefined,
    };

    const makeTransitionHooks = (item: {
      hook: RegisteredHook;
      matches: IMatchingNodes;
    }): HookTuple[] => {
      const { hook, matches } = item;

      const matchingNodes = matches[hookType._criteriaMatchPath.name];

      return matchingNodes.map((node) => {
        const options = Object.assign(
          {
            bind: hook.bind,
            hookType: hookType.name,
            target: node,
          },
          baseHookOptions,
        );

        const state: StateDeclaration | null =
          hookType._criteriaMatchPath.scope === TransitionHookScope._STATE
            ? node.state.self
            : null;

        const transitionHook = new TransitionHook(
          transition,
          state,
          hook,
          options,
          this.transition._transitionService._exceptionHandler,
        );

        return { hook, node, transitionHook };
      });
    };

    return matchingHooks
      .map(makeTransitionHooks)
      .reduce(unnestR, [])
      .sort(tupleSort(hookType.reverseSort))
      .map((tuple: HookTuple) => tuple.transitionHook);
  }

  getMatchingHooks(
    hookType: TransitionEventType,
    treeChanges: TreeChanges,
    transition: Transition,
  ): Array<{ hook: RegisteredHook; matches: IMatchingNodes }> {
    const isCreate = hookType.hookPhase === TransitionHookPhase._CREATE;

    const $transitions = this.transition._transitionService;

    const registries = isCreate
      ? [$transitions]
      : [this.transition, $transitions];

    return registries
      .map((reg) => reg.getHooks(hookType.name))
      .filter(assertPredicate(isArray, `broken event named: ${hookType.name}`))
      .reduce(unnestR, [])
      .map((hook: RegisteredHook) => ({
        hook,
        matches: hook.matches(treeChanges, transition),
      }))
      .filter(
        (entry: {
          hook: RegisteredHook;
          matches: IMatchingNodes | null;
        }): entry is { hook: RegisteredHook; matches: IMatchingNodes } =>
          !!entry.matches,
      );
  }
}

/**
 * Sorts hooks first by state depth, then by explicit hook priority.
 */
function tupleSort(reverseDepthSort = false) {
  return function nodeDepthThenPriority(
    left: HookTuple,
    right: HookTuple,
  ): number {
    const factor = reverseDepthSort ? -1 : 1;

    const depthDelta =
      ((left.node.state.path || []).length -
        (right.node.state.path || []).length) *
      factor;

    return depthDelta !== 0
      ? depthDelta
      : right.hook.priority - left.hook.priority;
  };
}
