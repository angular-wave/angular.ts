import { isArray } from "../../shared/utils.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { RegisteredHook } from "./hook-registry.ts";
import { TransitionHook, type TransitionHookPhase } from "./transition-hook.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

/** @internal */
interface HookTuple {
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
    current: () => transition._options.current?.() ?? undefined,
  };

  const hookTuples: HookTuple[] = [];

  const registeredHooks = transition._transitionService._getHooks(
    hookType._name,
  );

  if (!isArray(registeredHooks)) {
    throw new Error(`broken event named: ${hookType._name}`);
  }

  registeredHooks.forEach((hook) => {
    const matches = hook._matches(treeChanges, transition);

    if (!matches) return;

    const matchingNodes = matches[hookType._criteriaMatchPath._name];

    matchingNodes.forEach((node) => {
      const options = {
        _bind: hook._bind,
        _hookType: hookType._name,
        _target: node,
        _transition: baseHookOptions.transition,
        _current: baseHookOptions.current,
      };

      const state: StateDeclaration | null = hookType._criteriaMatchPath
        ._stateHook
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
    hookType._reverseSort
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
    ((left.node.state.path ?? []).length -
      (right.node.state.path ?? []).length) *
    factor;

  return depthDelta !== 0
    ? depthDelta
    : right.hook._priority - left.hook._priority;
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
