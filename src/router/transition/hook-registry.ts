import { map, removeFrom, tail } from "../../shared/common.ts";
import { isFunction, isString, values } from "../../shared/utils.js";
import { Glob } from "../glob/glob.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import { TransitionHookScope } from "./transition-hook.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookMatchCriterion,
  IMatchingNodes,
  RegisteredHooks,
  TransitionService,
  TreeChanges,
} from "./interface.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

/**
 * Tests a state against one hook match criterion.
 */
export function matchState(
  state: StateObject,
  criterion: HookMatchCriterion,
  transition: Transition,
): boolean {
  const toMatch = isString(criterion) ? [criterion] : criterion;

  const matchGlobs = (_state: ng.BuiltStateDeclaration): boolean => {
    const globStrings = toMatch as string[];

    for (let i = 0; i < globStrings.length; i++) {
      const glob = new Glob(globStrings[i]);

      if (
        (glob && glob.matches(_state.name)) ||
        (!glob && globStrings[i] === _state.name)
      ) {
        return true;
      }
    }

    return false;
  };

  const matchFn = (isFunction(toMatch) ? toMatch : matchGlobs) as unknown as (
    state: StateObject,
    transition: Transition,
  ) => unknown;

  return !!matchFn(state, transition);
}

/**
 * Stores one registered transition hook and evaluates whether it matches
 * a specific transition tree change set.
 */
export class RegisteredHook {
  tranSvc: TransitionService;
  eventType: TransitionEventType;
  callback: HookFn;
  matchCriteria: HookMatchCriteria;
  removeHookFromRegistry: (hook: RegisteredHook) => void;
  invokeCount: number;
  _deregistered: boolean;
  priority: number;
  bind: unknown;
  invokeLimit: number | undefined;

  constructor(
    tranSvc: TransitionService,
    eventType: TransitionEventType,
    callback: HookFn,
    matchCriteria: HookMatchCriteria,
    removeHookFromRegistry: (hook: RegisteredHook) => void,
    options: import("./interface.ts").HookRegOptions = {},
  ) {
    this.tranSvc = tranSvc;
    this.eventType = eventType;
    this.callback = callback;
    this.matchCriteria = matchCriteria;
    this.removeHookFromRegistry = removeHookFromRegistry;
    this.invokeCount = 0;
    this._deregistered = false;
    this.priority = options.priority || 0;
    this.bind = options.bind || null;
    this.invokeLimit = options.invokeLimit;
  }

  _matchingNodes(
    nodes: PathNode[],
    criterion: HookMatchCriterion,
    transition: Transition,
  ): PathNode[] | null {
    if (criterion === true) return nodes;

    const matching = nodes.filter((node) =>
      matchState(node.state, criterion, transition),
    );

    return matching.length ? matching : null;
  }

  _getDefaultMatchCriteria(): HookMatchCriteria {
    return map(this.tranSvc._getPathTypes(), () => true) as HookMatchCriteria;
  }

  _getMatchingNodes(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes {
    const criteria = Object.assign(
      this._getDefaultMatchCriteria(),
      this.matchCriteria,
    );

    return values(this.tranSvc._getPathTypes()).reduce((mn, pathType) => {
      const isStateHook = pathType.scope === TransitionHookScope._STATE;
      const path = (treeChanges[pathType.name] || []) as PathNode[];
      const transitionNode = tail(path) as PathNode | undefined;
      const nodes: PathNode[] = isStateHook
        ? path
        : transitionNode
          ? [transitionNode]
          : [];

      mn[pathType.name] = this._matchingNodes(
        nodes,
        criteria[pathType.name] as HookMatchCriterion,
        transition,
      ) as PathNode[];

      return mn;
    }, {} as IMatchingNodes);
  }

  matches(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes | null {
    const matches = this._getMatchingNodes(treeChanges, transition);
    const allMatched = values(matches).every((x) => x);

    return allMatched ? matches : null;
  }

  deregister(): void {
    this.removeHookFromRegistry(this);
    this._deregistered = true;
  }
}

type HookSource = {
  _registeredHooks?: RegisteredHooks;
} & Record<string, any>;

/**
 * Registers a hook on either the transition service or a single transition.
 */
export function registerHook(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
  matchCriteria: HookMatchCriteria,
  callback: HookFn,
  options: import("./interface.ts").HookRegOptions = {},
): DeregisterFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[eventType.name] =
    _registeredHooks[eventType.name] || []);

  const removeHookFn = (hook: RegisteredHook): void => {
    removeFrom(hooks, hook);
  };

  const registeredHook = new RegisteredHook(
    transitionService,
    eventType,
    callback,
    matchCriteria,
    removeHookFn,
    options,
  );

  hooks.push(registeredHook);

  return registeredHook.deregister.bind(registeredHook);
}

/**
 * Creates a convenience `onX` registration function for a transition event.
 */
export function makeEvent(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
): (
  matchObject: HookMatchCriteria,
  callback: HookFn,
  options?: import("./interface.ts").HookRegOptions,
) => DeregisterFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[eventType.name] = [] as RegisteredHook[]);

  const removeHookFn = (hook: RegisteredHook): void => {
    removeFrom(hooks, hook);
  };

  function hookRegistrationFn(
    matchObject: HookMatchCriteria,
    callback: HookFn,
    options: import("./interface.ts").HookRegOptions = {},
  ): DeregisterFn {
    const registeredHook = new RegisteredHook(
      transitionService,
      eventType,
      callback,
      matchObject,
      removeHookFn,
      options,
    );

    hooks.push(registeredHook);

    return registeredHook.deregister.bind(registeredHook);
  }

  hookSource[eventType.name] = hookRegistrationFn;

  return hookRegistrationFn;
}
