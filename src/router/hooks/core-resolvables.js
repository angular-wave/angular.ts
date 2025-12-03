import { Transition } from "../transition/transition.js";
import { Resolvable } from "../resolve/resolvable.js";
import { uniqR, unnestR } from "../../shared/common.js";

export function registerAddCoreResolvables(transitionService) {
  transitionService.onCreate({}, function addCoreResolvables(trans) {
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

// References to Transition in the treeChanges pathnodes makes all
// previous Transitions reachable in memory, causing a memory leak
// This function removes resolves for '$transition$' and `Transition` from the treeChanges.
// Do not use this on current transitions, only on old ones.
export function treeChangesCleanup(trans) {
  const nodes = Object.values(trans.treeChanges())
    .reduce(unnestR, [])
    .reduce(uniqR, []);

  // If the resolvable is a Transition, return a new resolvable with null data
  const replaceTransitionWithNull = (r) => {
    return TRANSITION_TOKENS.includes(r.token)
      ? Resolvable.fromData(r.token, null)
      : r;
  };

  nodes.forEach((node) => {
    node.resolvables = node.resolvables.map(replaceTransitionWithNull);
  });
}
