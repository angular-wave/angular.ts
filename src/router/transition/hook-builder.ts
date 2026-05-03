import { isArray } from "../../shared/utils.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { RegisteredHook } from "./hook-registry.ts";
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
    buildHooks(transition, eventType, hooks);
  });

  return hooks;
}

function buildHooks(
  transition: Transition,
  hookType: TransitionEventType,
  hooks: TransitionHook[],
): void {
  const treeChanges = transition._treeChanges;

  const baseHookOptions = {
    transition,
    current: () => transition._options.current?.() || undefined,
  };

  const hookTuples: HookTuple[] = [];

  const registeredHooks = transition._transitionService.getHooks(hookType.name);

  if (!isArray(registeredHooks)) {
    throw new Error(`broken event named: ${hookType.name}`);
  }

  registeredHooks.forEach((hook) => {
    const matches = hook.matches(treeChanges, transition);

    if (!matches) return;

    const matchingNodes = matches[hookType._criteriaMatchPath.name];

    matchingNodes.forEach((node) => {
      const options = {
        bind: hook.bind,
        hookType: hookType.name,
        target: node,
        transition: baseHookOptions.transition,
        current: baseHookOptions.current,
      };

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

  if (!hookTuples.length) return;

  hookTuples.sort(
    hookType.reverseSort
      ? sortByReverseNodeDepthThenPriority
      : sortByNodeDepthThenPriority,
  );

  hookTuples.forEach((tuple) => hooks.push(tuple.transitionHook));
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
