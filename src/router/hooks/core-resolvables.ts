import { values } from "../../shared/utils.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { Transition } from "../transition/transition.ts";
import type { PathNode } from "../path/path-node.ts";
import type { TransitionService } from "../transition/transition-service.ts";

/**
 * Adds built-in transition-scoped resolvables such as `$transition$`,
 * `$stateParams`, and `$state$` before the transition starts.
 */
export function registerAddCoreResolvables(
  transitionService: TransitionService,
) {
  return transitionService._onCreate(
    {},
    function addCoreResolvables(trans: Transition) {
      trans.addResolvable(Resolvable.fromData(Transition, trans), "");
      trans.addResolvable(Resolvable.fromData("$transition$", trans), "");
      trans.addResolvable(
        Resolvable.fromData("$stateParams", trans.params()),
        "",
      );
      trans.entering().forEach((state: ng.StateDeclaration) => {
        trans.addResolvable(Resolvable.fromData("$state$", state), state);
      });
    },
  );
}

const TRANSITION_TOKENS = ["$transition$", Transition];

/**
 * Clears transition object references from cached resolvables once a transition
 * falls out of router history, preventing stale retention.
 */
export function treeChangesCleanup(trans: Transition): void {
  const paths = values(trans.treeChanges() as Record<string, PathNode[]>);

  const nodes: PathNode[] = [];

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];

    for (let j = 0; j < path.length; j++) {
      const node = path[j];

      if (nodes.indexOf(node) === -1) {
        nodes.push(node);
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const { resolvables } = node;

    for (let j = 0; j < resolvables.length; j++) {
      const resolve = resolvables[j];

      if (TRANSITION_TOKENS.includes(resolve.token)) {
        resolvables[j] = Resolvable.fromData(resolve.token, null);
      }
    }
  }
}
