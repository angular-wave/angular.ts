import { uniqR, unnestR } from "../../shared/common.ts";
import { values } from "../../shared/utils.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { Transition } from "../transition/transition.ts";
import type { PathNode } from "../path/path-node.ts";
import type { TransitionService } from "../transition/interface.ts";

/**
 * Adds built-in transition-scoped resolvables such as `$transition$`,
 * `$stateParams`, and `$state$` before the transition starts.
 */
export function registerAddCoreResolvables(
  transitionService: TransitionService,
) {
  return transitionService.onCreate({}, function addCoreResolvables(trans) {
    trans.addResolvable(Resolvable.fromData(Transition, trans), "");
    trans.addResolvable(Resolvable.fromData("$transition$", trans), "");
    trans.addResolvable(
      Resolvable.fromData("$stateParams", trans.params()),
      "",
    );
    trans.entering().forEach((state) => {
      trans.addResolvable(Resolvable.fromData("$state$", state), state);
    });
  });
}

const TRANSITION_TOKENS = ["$transition$", Transition];

/**
 * Clears transition object references from cached resolvables once a transition
 * falls out of router history, preventing stale retention.
 */
export function treeChangesCleanup(trans: Transition): void {
  const nodes = values(trans.treeChanges() as Record<string, PathNode[]>)
    .reduce(unnestR, [])
    .reduce(uniqR, []);

  const replaceTransitionWithNull = (resolve: Resolvable): Resolvable =>
    TRANSITION_TOKENS.includes(resolve.token)
      ? Resolvable.fromData(resolve.token, null)
      : resolve;

  nodes.forEach((node: PathNode) => {
    node.resolvables = node.resolvables.map(replaceTransitionWithNull);
  });
}
