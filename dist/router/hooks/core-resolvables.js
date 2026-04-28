import { values } from '../../shared/utils.js';
import { Resolvable } from '../resolve/resolvable.js';
import { Transition } from '../transition/transition.js';

/**
 * Adds built-in transition-scoped resolvables such as `$transition$`,
 * `$stateParams`, and `$state$` before the transition starts.
 */
function registerAddCoreResolvables(transitionService) {
    return transitionService._onCreate({}, function addCoreResolvables(trans) {
        trans.addResolvable(Resolvable.fromData(Transition, trans), "");
        trans.addResolvable(Resolvable.fromData("$transition$", trans), "");
        trans.addResolvable(Resolvable.fromData("$stateParams", trans.params()), "");
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
function treeChangesCleanup(trans) {
    const paths = values(trans.treeChanges());
    const nodes = [];
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

export { registerAddCoreResolvables, treeChangesCleanup };
