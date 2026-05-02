import { assign, isArray } from "../../shared/utils.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { IMatchingNodes, RegisteredHook } from "./hook-registry.ts";
import type { TreeChanges } from "./interface.ts";
import {
  TransitionHook,
  TransitionHookPhase,
  TransitionHookScope,
} from "./transition-hook.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

/** @internal */
export interface HookTuple {
  hook: RegisteredHook;
  node: PathNode;
  transitionHook: TransitionHook;
}

/** @internal */
export function buildHooksForPhase(
  transition: Transition,
  phase: TransitionHookPhase,
): TransitionHook[] {
  const eventTypes = transition._transitionService._getEvents(phase);

  const hooks: TransitionHook[] = [];

  eventTypes.forEach((eventType) => {
    const builtHooks = buildHooks(transition, eventType);

    builtHooks.forEach((hook) => {
      if (hook) hooks.push(hook);
    });
  });

  return hooks;
}

function buildHooks(
  transition: Transition,
  hookType: TransitionEventType,
): TransitionHook[] {
  const treeChanges = transition._treeChanges;

  const matchingHooks = getMatchingHooks(hookType, treeChanges, transition);

  if (!matchingHooks.length) return [];

  const baseHookOptions = {
    transition,
    current: () => transition._options.current?.() || undefined,
  };

  const hookTuples: HookTuple[] = [];

  matchingHooks.forEach(({ hook, matches }) => {
    const matchingNodes = matches[hookType._criteriaMatchPath.name];

    matchingNodes.forEach((node) => {
      const options = assign(
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
        transition._transitionService._exceptionHandler,
      );

      hookTuples.push({ hook, node, transitionHook });
    });
  });

  hookTuples.sort(
    hookType.reverseSort
      ? sortByReverseNodeDepthThenPriority
      : sortByNodeDepthThenPriority,
  );

  const hooks: TransitionHook[] = [];

  hookTuples.forEach((tuple) => hooks.push(tuple.transitionHook));

  return hooks;
}

function getMatchingHooks(
  hookType: TransitionEventType,
  treeChanges: TreeChanges,
  transition: Transition,
): Array<{ hook: RegisteredHook; matches: IMatchingNodes }> {
  const $transitions = transition._transitionService;

  const matchingHooks: Array<{
    hook: RegisteredHook;
    matches: IMatchingNodes;
  }> = [];

  const hooks = $transitions.getHooks(hookType.name);

  if (!isArray(hooks)) {
    throw new Error(`broken event named: ${hookType.name}`);
  }

  hooks.forEach((hook) => {
    const matches = hook.matches(treeChanges, transition);

    if (matches) {
      matchingHooks.push({ hook, matches });
    }
  });

  return matchingHooks;
}

/**
 * Sorts hooks first by state depth, then by explicit hook priority.
 */
function compareHookTupleDepth(
  left: HookTuple,
  right: HookTuple,
  factor: 1 | -1,
): number {
  const depthDelta =
    ((left.node.state.path || []).length -
      (right.node.state.path || []).length) *
    factor;

  return depthDelta !== 0
    ? depthDelta
    : right.hook.priority - left.hook.priority;
}

function sortByNodeDepthThenPriority(
  left: HookTuple,
  right: HookTuple,
): number {
  return compareHookTupleDepth(left, right, 1);
}

function sortByReverseNodeDepthThenPriority(
  left: HookTuple,
  right: HookTuple,
): number {
  return compareHookTupleDepth(left, right, -1);
}
