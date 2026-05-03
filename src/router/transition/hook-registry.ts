import { removeFrom } from "../../shared/common.ts";
import { hasOwn, isFunction, isString } from "../../shared/utils.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookMatchCriterion,
  IStateMatch,
  HookRegOptions,
  TreeChanges,
} from "./interface.ts";
import { PATH_TYPES } from "./path-types.ts";
import type { TransitionService } from "./transition-service.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

/** @internal */
export interface MatchingNodes {
  [key: string]: PathNode[];

  to: PathNode[];
  from: PathNode[];
  exiting: PathNode[];
  retained: PathNode[];
  entering: PathNode[];
}

type HookRegistrationFn = (
  matchObject: HookMatchCriteria,
  callback: HookFn,
  options?: HookRegOptions,
) => DeregisterFn;

/**
 * Tests a state against one hook match criterion.
 */
function matchState(
  state: StateObject,
  criterion: HookMatchCriterion,
  transition: Transition,
): boolean {
  if (isString(criterion)) {
    return criterion === state.name;
  }

  if (isFunction(criterion)) {
    return !!(criterion as IStateMatch)(state, transition);
  }

  return false;
}

/**
 * Stores one registered transition hook and evaluates whether it matches
 * a specific transition tree change set.
 */
/** @internal */
export class RegisteredHook {
  /** @internal */
  _tranSvc: TransitionService;
  /** @internal */
  _eventType: TransitionEventType;
  /** @internal */
  _callback: HookFn;
  /** @internal */
  _matchCriteria: HookMatchCriteria;
  /** @internal */
  _hooks: RegisteredHook[];
  /** @internal */
  _invokeCount: number;
  /** @internal */
  _deregistered: boolean;
  /** @internal */
  _priority: number;
  /** @internal */
  _bind: unknown;
  /** @internal */
  _invokeLimit: number | undefined;

  constructor(
    tranSvc: TransitionService,
    eventType: TransitionEventType,
    callback: HookFn,
    matchCriteria: HookMatchCriteria,
    hooks: RegisteredHook[],
    options: HookRegOptions = {},
  ) {
    this._tranSvc = tranSvc;
    this._eventType = eventType as TransitionEventType;
    this._callback = callback;
    this._matchCriteria = matchCriteria;
    this._hooks = hooks;
    this._invokeCount = 0;
    this._deregistered = false;
    this._priority = options.priority || 0;
    this._bind = options.bind || null;
    this._invokeLimit = options.invokeLimit;
  }

  /** @internal */
  _matchingNodes(
    nodes: PathNode[],
    criterion: HookMatchCriterion,
    transition: Transition,
  ): PathNode[] | null {
    if (criterion === true) return nodes;

    const matching: PathNode[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (matchState(node.state, criterion, transition)) {
        matching.push(node);
      }
    }

    return matching.length ? matching : null;
  }

  /** @internal */
  _getMatchingNodes(
    treeChanges: TreeChanges,
    transition: Transition,
  ): MatchingNodes | null {
    const matchingNodes = {} as MatchingNodes;

    for (const name in PATH_TYPES) {
      const pathType = PATH_TYPES[name];

      const path = (treeChanges[pathType._name] || []) as PathNode[];

      const transitionNode = path.length ? path[path.length - 1] : undefined;

      const criterion = hasOwn(this._matchCriteria, pathType._name)
        ? (this._matchCriteria[pathType._name] as HookMatchCriterion)
        : true;

      if (criterion === true) {
        matchingNodes[pathType._name] = pathType._stateHook
          ? path
          : transitionNode
            ? [transitionNode]
            : [];
        continue;
      }

      const matching = pathType._stateHook
        ? this._matchingNodes(path, criterion, transition)
        : transitionNode &&
            matchState(transitionNode.state, criterion, transition)
          ? [transitionNode]
          : null;

      if (!matching) {
        return null;
      }

      matchingNodes[pathType._name] = matching;
    }

    return matchingNodes;
  }

  /** @internal */
  _matches(
    treeChanges: TreeChanges,
    transition: Transition,
  ): MatchingNodes | null {
    return this._getMatchingNodes(treeChanges, transition);
  }

  /** @internal */
  _deregister(): void {
    removeFrom(this._hooks, this);
    this._deregistered = true;
  }
}

/** @internal */
export interface RegisteredHooks {
  [key: string]: RegisteredHook[];
}

type HookSource = {
  /** @internal */
  _registeredHooks?: RegisteredHooks;
};

/**
 * Registers a hook on either the transition service or a single transition.
 *
 * @internal
 */
export function registerHook(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
  matchCriteria: HookMatchCriteria,
  callback: HookFn,
  options: HookRegOptions = {},
): DeregisterFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[eventType._name] =
    _registeredHooks[eventType._name] || []);

  const registeredHook = new RegisteredHook(
    transitionService,
    eventType,
    callback,
    matchCriteria,
    hooks,
    options,
  );

  hooks.push(registeredHook);

  return registeredHook._deregister.bind(registeredHook);
}

/**
 * Creates a convenience `onX` registration function for a transition event.
 *
 * @internal
 */
export function makeEvent(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
): HookRegistrationFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[eventType._name] = [] as RegisteredHook[]);

  function hookRegistrationFn(
    matchObject: HookMatchCriteria,
    callback: HookFn,
    options: HookRegOptions = {},
  ): DeregisterFn {
    const registeredHook = new RegisteredHook(
      transitionService,
      eventType,
      callback,
      matchObject,
      hooks,
      options,
    );

    hooks.push(registeredHook);

    return registeredHook._deregister.bind(registeredHook);
  }

  (hookSource as HookSource & Record<string, HookRegistrationFn>)[
    eventType._name
  ] = hookRegistrationFn;

  return hookRegistrationFn;
}
